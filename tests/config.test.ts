import { describe,expect,it } from 'vitest';
import { runtimeLimits } from '../lib/orchestration/config';

const env=(values:Record<string,string>)=>values as unknown as NodeJS.ProcessEnv;

describe('swarm profile limits',()=>{
 it('preserves the verified classic six-worker ceiling',()=>{expect(runtimeLimits(env({SWARM_PROFILE:'classic',MAX_WORKERS:'6'})).maxWorkers).toBe(6);});
 it('uses a separate expanded ceiling instead of inheriting classic MAX_WORKERS',()=>{expect(runtimeLimits(env({SWARM_PROFILE:'expanded',MAX_WORKERS:'6'})).maxWorkers).toBe(10);expect(runtimeLimits(env({SWARM_PROFILE:'expanded',MAX_WORKERS:'6',EXPANDED_MAX_WORKERS:'12'})).maxWorkers).toBe(12);});
 it('requires enough expanded capacity for the 3/2/2 worker contract',()=>{expect(()=>runtimeLimits(env({SWARM_PROFILE:'expanded',EXPANDED_MAX_WORKERS:'6'}))).toThrow('EXPANDED_MAX_WORKERS');});
 it('keeps Range V2 budgets independent from legacy V1 environment values',()=>{expect(runtimeLimits(env({FLASHOVER_RANGE:'v2',MAX_AGENT_STEPS:'3',MAX_TOOL_CALLS:'48',RUN_TIMEOUT_MS:'1000'}))).toMatchObject({profile:'range-v2',maxWorkers:22,maxSteps:18,maxToolCalls:180,runTimeoutMs:300000});});
});
