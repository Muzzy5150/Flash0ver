import { EventBus } from '../lib/events/bus';
import { providerFromEnv } from '../lib/agents/provider';
import { runPreflight } from '../lib/orchestration/preflight';
import { LocalTargetRuntime } from '../lib/target/local';
import { WasmerExecutor } from '../lib/wasmer/executor';
const bus=new EventBus();const target=new LocalTargetRuntime();const wasmer=new WasmerExecutor();
try{await target.start();await target.reset('preflight');const checks=await runPreflight({provider:providerFromEnv(),bus,target,wasmer,probeModel:true});for(const c of checks)console.log(`${c.name.padEnd(15)} ${c.status.padEnd(8)} ${c.detail}`);if(checks.some(c=>c.status==='BLOCKED'))process.exitCode=2;}finally{await wasmer.stop();await target.stop();bus.close();}
