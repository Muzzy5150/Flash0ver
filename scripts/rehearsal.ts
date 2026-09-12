import { randomUUID } from 'node:crypto';
import { EventBus } from '../lib/events/bus';
import { providerFromEnv } from '../lib/agents/provider';
import { runPreflight } from '../lib/orchestration/preflight';
import { targetFromEnv } from '../lib/target/factory';
import { WasmerExecutor } from '../lib/wasmer/executor';

const mandatory=new Set(['MODEL PROVIDER','WASMER','DATABASE','LOCAL RANGE','COLLECTOR']);
const bus=new EventBus();const target=targetFromEnv(process.env,bus).runtime;const wasmer=new WasmerExecutor();
try{
 let targetError:string|undefined;try{await target.start();}catch(error){targetError=error instanceof Error?error.message:'Selected target failed to initialize';}
 console.log('1/6 PREFLIGHT       running live dependency checks');
 const checks=await runPreflight({provider:providerFromEnv(),bus,target,wasmer,probeModel:true,targetError});
 const blockers=checks.filter(check=>(mandatory.has(check.name)||process.env.TARGET_RUNTIME==='tenki'&&check.name==='TENKI')&&check.status!=='READY');
 for(const check of checks)console.log(`    ${check.name.padEnd(15)} ${check.status}`);
 if(blockers.length)throw new Error(`Mandatory preflight blocked: ${blockers.map(check=>check.name).join(', ')}`);
 console.log('2/6 RESET RANGE    rotating synthetic artifacts and clearing collector');
 await target.reset(`rehearsal-${randomUUID()}`);
 console.log('3/6 COLLECTOR      verifying current generation is empty');
 const health=await target.health();if(!health.healthy||!health.collector||health.leaked)throw new Error('Collector or local range is not clean after reset');
 const provider=checks.find(check=>check.name==='MODEL PROVIDER');console.log(`4/6 MODEL          ${provider?.status} · ${provider?.detail}`);
 const sandbox=checks.find(check=>check.name==='WASMER');console.log(`5/6 WASMER         ${sandbox?.status} · ${sandbox?.detail}`);
 console.log('6/6 DEMO READY     mandatory local systems ready; collector clean; no attack executed');
}catch(error){console.error(`DEMO BLOCKED · ${error instanceof Error?error.message:'rehearsal failed'}`);process.exitCode=2;}finally{await wasmer.stop();await target.stop().catch(()=>{});bus.close();}
