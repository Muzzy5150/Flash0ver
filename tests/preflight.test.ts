import { describe,expect,it } from 'vitest';
import type { AgentProvider } from '../lib/agents/types';
import { EventBus } from '../lib/events/bus';
import { runPreflight } from '../lib/orchestration/preflight';
import type { TargetRuntime } from '../lib/target/types';
import type { WasmerExecutor } from '../lib/wasmer/executor';

const provider={model:'test',check:async()=>{},complete:async()=>({content:'',calls:[]})} satisfies AgentProvider;
const wasmer={probe:async()=>({exitCode:0}),stop:async()=>{}} as unknown as WasmerExecutor;
const target=(kind:'local'|'tenki'):TargetRuntime=>({kind,identity:kind==='local'?'localhost':'tenki sandbox test',start:async()=>{},reset:async()=>{},request:async()=>({status:200,body:{},facts:[]}),health:async()=>({healthy:true,collector:true,leaked:false}),stop:async()=>{}});

describe('Tenki preflight selection',()=>{
 it('leaves the local demo ready and Tenki degraded when local is selected',async()=>{
  const bus=new EventBus();const checks=await runPreflight({provider,bus,target:target('local'),wasmer,env:{NODE_ENV:'test',LLM_API_KEY:'test',TARGET_RUNTIME:'local'},probeModel:true});
  expect(checks.find(check=>check.name==='LOCAL RANGE')?.status).toBe('READY');expect(checks.find(check=>check.name==='TENKI')?.status).toBe('DEGRADED');bus.close();
 });
 it('reports Tenki ready only for a healthy explicit Tenki runtime',async()=>{
  const bus=new EventBus();const checks=await runPreflight({provider,bus,target:target('tenki'),wasmer,env:{NODE_ENV:'test',LLM_API_KEY:'test',TARGET_RUNTIME:'tenki',TENKI_API_KEY:'tk_test'},probeModel:true});
  expect(checks.find(check=>check.name==='TENKI')?.status).toBe('READY');bus.close();
 });
 it('reports explicit Tenki initialization failure as blocked',async()=>{
  const bus=new EventBus();const checks=await runPreflight({provider,bus,target:target('tenki'),wasmer,env:{NODE_ENV:'test',LLM_API_KEY:'test',TARGET_RUNTIME:'tenki',TENKI_API_KEY:'tk_test'},probeModel:true,targetError:'unauthorized tk_secret'});
  const tenki=checks.find(check=>check.name==='TENKI');expect(tenki?.status).toBe('BLOCKED');expect(tenki?.detail).not.toContain('tk_secret');expect(checks.find(check=>check.name==='COLLECTOR')?.status).toBe('BLOCKED');bus.close();
 });
});
