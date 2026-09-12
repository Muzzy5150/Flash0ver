import { EventBus } from '../lib/events/bus';
import { providerFromEnv } from '../lib/agents/provider';
import { runPreflight } from '../lib/orchestration/preflight';
import { targetFromEnv } from '../lib/target/factory';
import { WasmerExecutor } from '../lib/wasmer/executor';
const bus=new EventBus();const target=targetFromEnv(process.env,bus).runtime;const wasmer=new WasmerExecutor();
try{let targetError:string|undefined;try{await target.start();await target.reset('preflight');}catch(error){targetError=error instanceof Error?error.message:'Selected target failed to initialize';}const checks=await runPreflight({provider:providerFromEnv(),bus,target,wasmer,probeModel:true,targetError});for(const c of checks)console.log(`${c.name.padEnd(15)} ${c.status.padEnd(8)} ${c.detail}`);if(checks.some(c=>c.status==='BLOCKED'))process.exitCode=2;}finally{await wasmer.stop();await target.stop().catch(()=>{});bus.close();}
