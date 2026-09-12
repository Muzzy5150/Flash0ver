import { randomBytes,randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { TenkiSandbox } from '@tenkicloud/sandbox';
import type { EventBus } from '../events/bus';
import type { RangeReply,RangeRequest,TargetRuntime } from './types';
import { validatePath } from './local';

const RANGE_PORT=4311;
const CREATE_TIMEOUT_MS=180_000;
const PROVISION_TIMEOUT_MS=60_000;
const REQUEST_TIMEOUT_MS=8_000;
const SESSION_DURATION_MS=30*60_000;

interface ExecResultLike {status:string;exitCode:number;stderr:Uint8Array;}
interface ExposedPortLike {previewUrl:string;}
interface SessionLike {
 id:string;state?:string;
 exec(command:string|string[],options?:{args?:string[];timeoutMs?:number;env?:Record<string,string>;signal?:AbortSignal}):Promise<ExecResultLike>;
 writeFile(path:string,data:string|Uint8Array):Promise<void>;
 exposePort(port:number,options?:{ttlMs?:number;slug?:string}):Promise<ExposedPortLike>;
 unexposePort(port:number):Promise<void>;
 close():Promise<void>;
 refresh?():Promise<void>;
}
interface ClientLike {whoAmI():Promise<{workspaces:unknown[]}>;create(options:Record<string,unknown>):Promise<SessionLike>;close():void;}
export interface TenkiTargetOptions {apiKey:string;bus?:EventBus;clientFactory?:(apiKey:string)=>ClientLike;fetcher?:typeof fetch;}

export class TenkiTargetRuntime implements TargetRuntime {
 readonly kind='tenki' as const;
 identity='tenki · not initialized';
 private client?:ClientLike;private session?:SessionLike;private origin?:string;private sandboxId?:string;
 private brokerToken=randomBytes(32).toString('hex');private lifecycleRunId=`tenki-lifecycle-${randomUUID()}`;private stopPromise?:Promise<void>;
 private readonly fetcher:typeof fetch;private readonly clientFactory:(apiKey:string)=>ClientLike;
 constructor(private options:TenkiTargetOptions){
  this.fetcher=options.fetcher??fetch;
  this.clientFactory=options.clientFactory??sdkClient;
  options.bus?.protect(options.apiKey);options.bus?.protect(this.brokerToken);
 }
 async start(){
  if(this.session)return;
  if(!this.options.apiKey)throw new Error('TENKI_API_KEY is required when TARGET_RUNTIME=tenki');
  const lifecycleStarted=performance.now();this.client=this.clientFactory(this.options.apiKey);let authenticated=false;
  try{
   const authStarted=performance.now();const identity=await this.client.whoAmI();
   authenticated=true;
   this.emit('TENKI_AUTH_OK','Tenki API authentication succeeded',{durationMs:round(performance.now()-authStarted),status:'authenticated',workspaces:identity.workspaces.length});
   const createStarted=performance.now();
   this.session=await this.client.create({name:`flash0ver-${randomUUID().slice(0,8)}`,cpuCores:2,memoryMb:2048,diskSizeGb:5,allowInbound:true,allowOutbound:false,maxDurationMs:SESSION_DURATION_MS,idleTimeoutMinutes:15,waitReady:true,waitTimeoutMs:CREATE_TIMEOUT_MS,metadata:{project:'flash0ver',purpose:'authorized-disposable-range'},tags:['flash0ver','authorized-range']});
   this.sandboxId=this.session.id;this.identity=`tenki sandbox ${this.sandboxId}`;
   this.emit('TENKI_SANDBOX_CREATED','Disposable Tenki sandbox created',{sandboxId:this.sandboxId,durationMs:round(performance.now()-createStarted),status:'running'});
   const provisionStarted=performance.now();this.emit('TENKI_PROVISION_STARTED','Tenki range provisioning started',{sandboxId:this.sandboxId,status:'provisioning'});
   const command=await this.session.exec(['node','--version'],{timeoutMs:15_000});assertCommand(command,'harmless Node runtime check');
   const source=await readFile(new URL('../../range/tenki/remote-range.mjs',import.meta.url),'utf8');
   await this.session.writeFile('/home/tenki/flash0ver-range.mjs',source);
   const launched=await this.session.exec('sh',{args:['-c','node /home/tenki/flash0ver-range.mjs >/home/tenki/flash0ver-range.log 2>&1 &'],env:{FLASH0VER_BROKER_TOKEN:this.brokerToken,FLASH0VER_RANGE_PORT:String(RANGE_PORT)},timeoutMs:15_000});assertCommand(launched,'range service launch');
   const exposed=await this.session.exposePort(RANGE_PORT,{ttlMs:SESSION_DURATION_MS});
   this.origin=validateTenkiBaseUrl(exposed.previewUrl);
   await this.waitForHealth(AbortSignal.timeout(PROVISION_TIMEOUT_MS));
   this.emit('TENKI_PROVISION_READY','Tenki range provisioning completed',{sandboxId:this.sandboxId,durationMs:round(performance.now()-provisionStarted),lifecycleDurationMs:round(performance.now()-lifecycleStarted),status:'ready'});
  }catch(error){
   const message=this.safe(error);if(!authenticated)this.emit('TENKI_AUTH_FAILED','Tenki authentication failed',{durationMs:round(performance.now()-lifecycleStarted),status:'failed',error:message});else this.emit('TENKI_HEALTH_FAILED','Tenki sandbox lifecycle failed before readiness',{sandboxId:this.sandboxId,durationMs:round(performance.now()-lifecycleStarted),status:'failed',error:message});
   await this.stop().catch(()=>{});throw new Error(message);
  }
 }
 async reset(runId:string){
  const started=performance.now();const reply=await this.control('/control/reset','POST',{runId});
  if(reply.status!==200||reply.body.reset!==true)throw new Error('Tenki range reset was not acknowledged');
  this.lifecycleRunId=runId;this.emit('TENKI_RESET','Tenki range reset; canary rotated and collector cleared',{sandboxId:this.sandboxId,durationMs:round(performance.now()-started),status:'ready'});
 }
 async request(req:RangeRequest,signal?:AbortSignal):Promise<RangeReply>{
  validatePath(req.path);const url=this.scopedUrl(`/range/${req.service}${req.path}`);
  const response=await this.fetcher(url,{method:req.method,headers:{authorization:`Bearer ${this.brokerToken}`,'content-type':'application/json','x-agent-role':req.role,'x-agent-id':req.agentId,'x-run-id':req.runId},body:req.method==='POST'?JSON.stringify(req.body??{}):undefined,redirect:'error',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(REQUEST_TIMEOUT_MS)]):AbortSignal.timeout(REQUEST_TIMEOUT_MS)});
  return await parseReply(response);
 }
 async health(){
  const started=performance.now();
  try{const reply=await this.control('/control/health','GET');return {healthy:reply.status===200&&reply.body.healthy===true&&reply.body.services===5,collector:reply.status===200&&reply.body.collector===true,leaked:reply.body.leaked===true};}
  catch(error){this.emit('TENKI_HEALTH_FAILED','Tenki range health check failed',{sandboxId:this.sandboxId,durationMs:round(performance.now()-started),status:'failed',error:this.safe(error)});throw error;}
 }
 async stop(){
  if(this.stopPromise)return this.stopPromise;
  this.stopPromise=this.destroy();await this.stopPromise;
 }
 metadata(){return {kind:this.kind,sandboxId:this.sandboxId,origin:this.origin,status:this.session?'running':'stopped'};}
 private async destroy(){
  const session=this.session;const client=this.client;const sandboxId=this.sandboxId;const started=performance.now();
  this.session=undefined;this.client=undefined;this.origin=undefined;
  try{
   if(session){try{await session.unexposePort(RANGE_PORT);}catch{}await session.close();if(session.refresh){try{await session.refresh();}catch{}}this.emit('TENKI_SANDBOX_DESTROYED','Disposable Tenki sandbox destroyed',{sandboxId,durationMs:round(performance.now()-started),status:session.state==='TERMINATED'||session.state===undefined?'confirmed':'close-confirmed'});}
  }finally{client?.close();this.identity='tenki · stopped';}
 }
 private async control(path:string,method:'GET'|'POST',body?:Record<string,unknown>){
  const response=await this.fetcher(this.scopedUrl(path),{method,headers:{authorization:`Bearer ${this.brokerToken}`,'content-type':'application/json'},body:method==='POST'?JSON.stringify(body??{}):undefined,redirect:'error',signal:AbortSignal.timeout(REQUEST_TIMEOUT_MS)});return parseReply(response);
 }
 private scopedUrl(path:string){
  if(!this.origin)throw new Error('Tenki range is not initialized');
  const url=new URL(path,this.origin);if(url.origin!==this.origin||!url.pathname.startsWith('/range/')&&!url.pathname.startsWith('/control/'))throw new Error('Tenki request escaped the configured range origin');return url;
 }
 private async waitForHealth(signal:AbortSignal){
  let last='range endpoint unavailable';for(let attempt=0;!signal.aborted;attempt++){try{const health=await this.health();if(health.healthy&&health.collector)return;}catch(error){last=this.safe(error);}await delay(Math.min(2000,250*2**Math.min(attempt,3)),signal);}throw new Error(`Tenki range health timed out: ${last}`);
 }
 private emit(eventType:Parameters<EventBus['emit']>[0]['eventType'],summary:string,data:Record<string,unknown>){this.options.bus?.emit({runId:this.lifecycleRunId,eventType,summary,data});}
 private safe(error:unknown){let message=error instanceof Error?error.message:'Tenki operation failed';if(this.options.apiKey)message=message.split(this.options.apiKey).join('[REDACTED]');return message.replace(/tk_[A-Za-z0-9_-]+/g,'[REDACTED]').slice(0,800);}
}

export function validateTenkiBaseUrl(raw:string){
 const url=new URL(raw);if(url.protocol!=='https:'||url.username||url.password||url.port||url.search||url.hash||url.pathname!=='/'||!url.hostname||url.hostname==='localhost'||url.hostname==='127.0.0.1')throw new Error('Tenki exposed range URL failed validation');return url.origin;
}

function sdkClient(apiKey:string):ClientLike{
 const client=new TenkiSandbox({authToken:apiKey,baseUrl:'https://api.tenki.cloud',timeoutMs:CREATE_TIMEOUT_MS,dataPlaneReadyTimeoutMs:CREATE_TIMEOUT_MS,warningHandler:null});
 return {whoAmI:()=>client.whoAmI(),create:options=>client.create(options).then(session=>session as unknown as SessionLike),close:()=>client.close()};
}
function assertCommand(result:ExecResultLike,label:string){if(result.status!=='SUCCEEDED'||result.exitCode!==0)throw new Error(`Tenki ${label} failed: ${new TextDecoder().decode(result.stderr).slice(0,300)}`);}
async function parseReply(response:Response){const reply=await response.json() as RangeReply;if(!reply||typeof reply.status!=='number'||!reply.body||!Array.isArray(reply.facts))throw new Error('Tenki range returned an invalid response');return reply;}
function delay(ms:number,signal:AbortSignal){return new Promise<void>((resolve,reject)=>{const timer=setTimeout(resolve,ms);signal.addEventListener('abort',()=>{clearTimeout(timer);reject(signal.reason);},{once:true});});}
function round(value:number){return Math.round(value*100)/100;}
