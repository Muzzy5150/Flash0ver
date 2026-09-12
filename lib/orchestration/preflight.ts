import type { AgentProvider } from '../agents/types';
import type { EventBus } from '../events/bus';
import type { TargetRuntime } from '../target/types';
import type { WasmerExecutor } from '../wasmer/executor';
export type PreflightStatus='READY'|'DEGRADED'|'BLOCKED';
export interface PreflightCheck {name:'MODEL PROVIDER'|'WASMER'|'DATABASE'|'LOCAL RANGE'|'COLLECTOR'|'TENKI';status:PreflightStatus;detail:string;}
export async function runPreflight(deps:{provider:AgentProvider;bus:EventBus;target:TargetRuntime;wasmer:WasmerExecutor;env?:NodeJS.ProcessEnv;probeModel?:boolean;targetError?:string}):Promise<PreflightCheck[]> {
 const env=deps.env??process.env;const checks:PreflightCheck[]=[];
 if(!env.LLM_API_KEY) checks.push({name:'MODEL PROVIDER',status:'BLOCKED',detail:'LLM_API_KEY is not configured; autonomous runs are disabled.'});
 else if(deps.probeModel===false) checks.push({name:'MODEL PROVIDER',status:'DEGRADED',detail:`Credentials configured for ${deps.provider.model}; live provider request not run.`});
 else {try{await deps.provider.check(AbortSignal.timeout(30000));checks.push({name:'MODEL PROVIDER',status:'READY',detail:`Live request succeeded for ${deps.provider.model}.`});}catch(error){checks.push({name:'MODEL PROVIDER',status:'BLOCKED',detail:safe(error)});}}
 try{const result=await deps.wasmer.probe(AbortSignal.timeout(60000));checks.push({name:'WASMER',status:'READY',detail:`Real sandbox probe exited ${result.exitCode}; host environment absent.`});}catch(error){checks.push({name:'WASMER',status:'BLOCKED',detail:safe(error)});}
 checks.push({name:'DATABASE',status:deps.bus.healthy()?'READY':'BLOCKED',detail:deps.bus.healthy()?'SQLite read/write event store is available.':'SQLite health query failed.'});
 let rangeError=deps.targetError;
 if(rangeError){checks.push({name:'LOCAL RANGE',status:'BLOCKED',detail:safe(rangeError)});checks.push({name:'COLLECTOR',status:'BLOCKED',detail:'Collector could not be checked because the selected range is unavailable.'});}
 else try{const health=await deps.target.health();checks.push({name:'LOCAL RANGE',status:health.healthy?'READY':'BLOCKED',detail:health.healthy?`${deps.target.identity} healthy.`:'One or more owned range services failed health check.'});checks.push({name:'COLLECTOR',status:health.collector?'READY':'BLOCKED',detail:health.collector?'Owned collector health check passed.':'Owned collector is unavailable.'});if(!health.healthy||!health.collector)rangeError='Selected range health check failed';}catch(error){rangeError=safe(error);checks.push({name:'LOCAL RANGE',status:'BLOCKED',detail:rangeError});checks.push({name:'COLLECTOR',status:'BLOCKED',detail:'Collector could not be checked because the selected range is unavailable.'});}
 const tenkiRequested=env.TARGET_RUNTIME==='tenki';
 checks.push(tenkiRequested?(rangeError?{name:'TENKI',status:'BLOCKED',detail:`Explicit Tenki selection failed: ${safe(rangeError)}`}:{name:'TENKI',status:'READY',detail:`Authenticated disposable range is active: ${deps.target.identity}; explicit cleanup is available.`}):env.TENKI_API_KEY?{name:'TENKI',status:'DEGRADED',detail:'Tenki credentials are configured but TARGET_RUNTIME=local; localhost remains active.'}:{name:'TENKI',status:'DEGRADED',detail:'Optional: Tenki credentials are not configured; localhost runtime remains active.'});
 return checks;
}
function safe(error:unknown){const message=error instanceof Error?error.message:String(error||'Preflight check failed');return message.replace(/tk_[A-Za-z0-9_-]+/g,'[REDACTED]');}
