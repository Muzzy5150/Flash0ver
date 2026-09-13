import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { EventBus } from '../lib/events/bus';
import { providerFromEnv } from '../lib/agents/provider';
import { runtimeLimits } from '../lib/orchestration/config';
import { runPreflight, type PreflightCheck } from '../lib/orchestration/preflight';
import { OBJECTIVE, SwarmRuntime } from '../lib/orchestration/runtime';
import { targetFromEnv } from '../lib/target/factory';
import { WasmerExecutor } from '../lib/wasmer/executor';
import type { Mode } from '../lib/events/schema';

mkdirSync('data',{recursive:true});
const bus=new EventBus('data/flash0ver.sqlite');
const targetSelection=targetFromEnv(process.env,bus);const target=targetSelection.runtime;let targetStartError:string|undefined;
try{await target.start();await target.reset(`boot-${randomUUID()}`);}catch(error){targetStartError=error instanceof Error?error.message:'Selected target runtime failed to initialize';}
const provider=providerFromEnv();const wasmer=new WasmerExecutor(bus);const runtime=new SwarmRuntime(provider,bus,target,wasmer,runtimeLimits());
let mode:Mode='OFF';let active=false;let currentRunId:string|undefined;let preflight:PreflightCheck[]=[];let activeRun:ReturnType<SwarmRuntime['run']>|undefined;

async function refreshPreflight(probeModel=true){preflight=await runPreflight({provider,bus,target,wasmer,probeModel,targetError:targetStartError});return preflight;}
const server=createServer(async(req,res)=>{
 try {
  const url=new URL(req.url||'/','http://localhost');setHeaders(res);
  if(req.method==='OPTIONS'){res.writeHead(204);return res.end();}
  if(req.method==='GET'&&url.pathname==='/api/events')return streamEvents(res,url.searchParams.get('runId')||undefined,Number(url.searchParams.get('after')||0));
  if(req.method==='GET'&&url.pathname==='/api/state')return json(res,200,state());
  if(req.method==='GET'&&url.pathname==='/api/preflight')return json(res,200,{checks:await refreshPreflight(true)});
  if(req.method==='POST'&&url.pathname==='/api/mode'){if(active)return json(res,409,{error:'Mode cannot change while a run is active'});mode=z.object({mode:z.enum(['OFF','MONITOR','ENFORCE'])}).parse(await body(req)).mode;return json(res,200,{mode});}
  if(req.method==='POST'&&url.pathname==='/api/run'){
   if(active)return json(res,409,{error:'A run is already active'});active=true;
   try {const checks=await refreshPreflight(true);const blockers=checks.filter(c=>c.status==='BLOCKED');if(blockers.length){active=false;return json(res,412,{error:'Demo preflight is blocked',checks:blockers});}}
   catch(error){active=false;throw error;}
   activeRun=runtime.run(mode);void activeRun.then(result=>{currentRunId=result.runId;}).finally(()=>{active=false;activeRun=undefined;});return json(res,202,{started:true,mode});
  }
  if(req.method==='POST'&&url.pathname==='/api/replay'){
   if(active)return json(res,409,{error:'A run is already active'});const replayOf=currentRunId;if(!replayOf)return json(res,409,{error:'No completed incident is available to rerun'});const requested=z.object({mode:z.enum(['OFF','MONITOR','ENFORCE']).optional()}).parse(await body(req));if(requested.mode)mode=requested.mode;active=true;
   try{const checks=await refreshPreflight(true);const blockers=checks.filter(check=>check.status==='BLOCKED');if(blockers.length){active=false;return json(res,412,{error:'Replay preflight is blocked',checks:blockers});}}
   catch(error){active=false;throw error;}
   activeRun=runtime.run(mode,OBJECTIVE,undefined,{replayOf});void activeRun.then(result=>{currentRunId=result.runId;}).finally(()=>{active=false;activeRun=undefined;});return json(res,202,{started:true,mode,replayOf,label:'NEW LIVE REPLAY'});
  }
  if(req.method==='POST'&&url.pathname==='/api/reset'){await runtime.stop('Range reset');await activeRun;await target.reset(`reset-${randomUUID()}`);currentRunId=undefined;active=false;bus.emit({runId:`reset-${randomUUID()}`,eventType:'RUN_RESET',summary:'Range reset; canary rotated and collector cleared',data:{target:target.identity}});return json(res,200,{reset:true});}
  if(req.method==='POST'&&url.pathname==='/api/kill'){await runtime.stop('Presenter killed swarm');await activeRun;return json(res,200,{stopped:true});}
  return json(res,404,{error:'Route not found'});
 } catch(error){return json(res,400,{error:error instanceof Error?error.message:'Request failed'});}
});
function state(){const events=bus.list().slice(-5000);return {mode,active,currentRunId,preflight,events,agents:[...runtime.agents.values()],target:target.identity};}
function streamEvents(res:ServerResponse,runId?:string,after=0){res.writeHead(200,{'content-type':'text/event-stream','cache-control':'no-cache, no-transform',connection:'keep-alive','x-accel-buffering':'no'});res.write(': connected\n\n');for(const event of bus.list(runId,after))res.write(`id: ${event.sequence}\ndata: ${JSON.stringify(event)}\n\n`);const unsub=bus.subscribe(event=>{if(!runId||event.runId===runId)res.write(`id: ${event.sequence}\ndata: ${JSON.stringify(event)}\n\n`);});const heartbeat=setInterval(()=>res.write(': heartbeat\n\n'),15000);res.on('close',()=>{clearInterval(heartbeat);unsub();});}
async function body(req:IncomingMessage){let text='';for await(const chunk of req){text+=chunk;if(Buffer.byteLength(text)>16384)throw new Error('Body too large');}return text?JSON.parse(text):{};}
function setHeaders(res:ServerResponse){res.setHeader('access-control-allow-origin','http://127.0.0.1:3000');res.setHeader('access-control-allow-methods','GET,POST,OPTIONS');res.setHeader('access-control-allow-headers','content-type');res.setHeader('x-content-type-options','nosniff');}
function json(res:ServerResponse,status:number,value:unknown){res.setHeader('content-type','application/json');res.writeHead(status);res.end(JSON.stringify(value));}
await refreshPreflight(false);
const port=Number(process.env.CONTROL_PORT||4310);server.listen(port,'127.0.0.1',()=>console.log(`FLASH0VER control plane listening at http://127.0.0.1:${port}`));
async function shutdown(){await runtime.stop('Control plane shutdown');await target.stop();bus.close();server.close();}
process.once('SIGINT',()=>void shutdown());process.once('SIGTERM',()=>void shutdown());
