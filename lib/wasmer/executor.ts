import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { Worker } from 'node:worker_threads';
import type { EventBus } from '../events/bus';

export interface SandboxOutput {exitCode:number;reason:string;stdout:string;stderr:string;}
export interface SandboxInput {code:string;files?:Record<string,string>;env?:Record<string,string>;timeoutMs?:number;signal?:AbortSignal;runId?:string;agentId?:string;}

export class WasmerExecutor {
 private worker?:Worker;
 private ready?:Promise<void>;
 private queue:Promise<void>=Promise.resolve();
 constructor(private bus?:EventBus,private packageName=process.env.WASMER_PYTHON_PACKAGE||'python/python@=3.13.18') {}

 async warm(signal?:AbortSignal){await this.ensureWorker(signal);}

 async execute(input:SandboxInput):Promise<SandboxOutput> {
  validate(input);input.signal?.throwIfAborted();
  let resolveResult!:(result:SandboxOutput)=>void;let rejectResult!:(error:unknown)=>void;
  const result=new Promise<SandboxOutput>((resolve,reject)=>{resolveResult=resolve;rejectResult=reject;});
  this.queue=this.queue.catch(()=>{}).then(async()=>{try{resolveResult(await this.executeQueued(input));}catch(error){rejectResult(error);}});
  return result;
 }

 private async executeQueued(input:SandboxInput):Promise<SandboxOutput>{
  input.signal?.throwIfAborted();await this.ensureWorker(input.signal);input.signal?.throwIfAborted();
  const worker=this.worker!;const id=randomUUID();const timeoutMs=Math.min(input.timeoutMs??10000,15000);const requested=performance.now();
  return new Promise<SandboxOutput>((resolve,reject)=>{
   let settled=false;let started=false;let setupMs=0;
   const finish=(error?:Error,result?:SandboxOutput,executionMs=0)=>{
    if(settled)return;settled=true;clearTimeout(timer);input.signal?.removeEventListener('abort',abort);worker.off('message',message);worker.off('error',workerError);worker.off('exit',workerExit);
    const durationMs=round(performance.now()-requested);
    if(started&&input.runId)this.bus?.emit({runId:input.runId,agentId:input.agentId,eventType:'WASMER_PROCESS_EXITED',summary:error?'Wasmer process terminated':`Wasmer process exited (${result?.exitCode})`,data:{exitCode:result?.exitCode,reason:result?.reason??error?.message,durationMs,setupMs:round(setupMs),executionMs:round(executionMs),reusedEngine:true,freshSandbox:true}});
    if(error)reject(error);else resolve(result!);
   };
   const invalidate=(error:Error)=>{void this.invalidate(worker);finish(error);};
   const abort=()=>invalidate(new Error('Sandbox cancelled'));
   const timer=setTimeout(()=>invalidate(new Error('Wasmer hard timeout')),timeoutMs+5000);
   const message=(msg:{id?:string;started?:boolean;pid?:number;setupMs?:number;executionMs?:number;error?:string;result?:SandboxOutput})=>{
    if(msg.id!==id)return;
    if(msg.started){started=true;setupMs=msg.setupMs||0;if(input.runId)this.bus?.emit({runId:input.runId,agentId:input.agentId,eventType:'WASMER_PROCESS_STARTED',summary:'Python executing inside Wasmer',data:{pid:msg.pid,network:'disabled',filesystem:'/workspace only',environment:'explicit safe values only',setupMs:round(setupMs),reusedEngine:true,freshSandbox:true}});}
    if(msg.error)finish(new Error(msg.error),undefined,msg.executionMs);
    if(msg.result)finish(undefined,msg.result,msg.executionMs);
   };
   const workerError=(error:Error)=>invalidate(error);
   const workerExit=()=>finish(new Error('Wasmer worker exited unexpectedly'));
   input.signal?.addEventListener('abort',abort,{once:true});worker.on('message',message);worker.once('error',workerError);worker.once('exit',workerExit);
   worker.postMessage({id,code:input.code,files:input.files??{},env:input.env??{},timeoutMs});
   if(input.signal?.aborted)abort();
  });
 }

 private async ensureWorker(signal?:AbortSignal){
  if(this.worker&&this.ready)return await withSignal(this.ready,signal);
  const worker=new Worker(new URL('./runner.mjs',import.meta.url),{env:{},workerData:{package:this.packageName,cache:resolve('.wasmer')},resourceLimits:{maxOldGenerationSizeMb:256}});this.worker=worker;
  this.ready=new Promise<void>((resolveReady,rejectReady)=>{
   const timer=setTimeout(()=>fail(new Error('Wasmer initialization timed out')),60000);
   const message=(msg:{ready?:boolean;initError?:string})=>{if(msg.ready){cleanup();resolveReady();}if(msg.initError)fail(new Error(msg.initError));};
   const error=(reason:Error)=>fail(reason);const exit=()=>fail(new Error('Wasmer worker exited during initialization'));
   const cleanup=()=>{clearTimeout(timer);worker.off('message',message);worker.off('error',error);worker.off('exit',exit);};
   const fail=(reason:Error)=>{cleanup();void this.invalidate(worker);rejectReady(reason);};
   worker.on('message',message);worker.once('error',error);worker.once('exit',exit);
  });
  return await withSignal(this.ready,signal);
 }

 private async invalidate(worker:Worker){if(this.worker===worker){this.worker=undefined;this.ready=undefined;}await worker.terminate();}

 async gate(request:{service:string;path:string;method:string;body?:Record<string,unknown>},allowed:string[],context:Pick<SandboxInput,'signal'|'agentId'|'runId'>) {
  const out=await this.execute({...context,files:{'intent.json':JSON.stringify(request),'capabilities.json':JSON.stringify(allowed)},code:`import json\nr=json.load(open('/workspace/intent.json'))\nallowed=json.load(open('/workspace/capabilities.json'))\nassert r['service'] in allowed, 'Service capability denied'\nassert r['method'] in ['GET','POST'], 'Method denied'\nassert r['path'].startswith('/') and not r['path'].startswith('//'), 'Absolute URLs denied'\nprint(json.dumps(r))`});
  if(out.exitCode!==0)throw new Error('Wasmer capability gate denied the request');return JSON.parse(out.stdout) as typeof request;
 }

 async probe(signal?:AbortSignal) {
  const out=await this.execute({signal,code:"import os,json\nprint(json.dumps({'ok': 6*7 == 42, 'host_env_absent': os.getenv('LLM_API_KEY') is None, 'workspace': os.path.isdir('/workspace')}))"});
  if(out.exitCode!==0||!JSON.parse(out.stdout).ok)throw new Error('Wasmer probe failed');return out;
 }

 async stop(){const worker=this.worker;this.worker=undefined;this.ready=undefined;if(worker)await worker.terminate();this.queue=Promise.resolve();}
}

function validate(input:SandboxInput){
 const files=input.files??{};if(Object.keys(files).length>20||JSON.stringify(files).length>64000||input.code.length>16000)throw new Error('Sandbox input budget exceeded');
 for(const name of Object.keys(files))if(!/^[a-zA-Z0-9_-][a-zA-Z0-9_.-]*$/.test(name)||name==='main.py')throw new Error('Only simple sandbox filenames are permitted');
 if(Object.keys(input.env??{}).some(key=>!/^FLASH0VER_SAFE_[A-Z0-9_]+$/.test(key)))throw new Error('Only FLASH0VER_SAFE_* guest environment keys are permitted');
}
async function withSignal<T>(promise:Promise<T>,signal?:AbortSignal){if(!signal)return promise;signal.throwIfAborted();return await new Promise<T>((resolve,reject)=>{const abort=()=>reject(new Error('Sandbox cancelled'));signal.addEventListener('abort',abort,{once:true});promise.then(value=>{signal.removeEventListener('abort',abort);resolve(value);},error=>{signal.removeEventListener('abort',abort);reject(error);});});}
function round(value:number){return Math.round(value*100)/100;}
