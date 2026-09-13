import { describe,expect,it } from 'vitest';
import { runtimeLimits } from '../lib/orchestration/config';

const env=(values:Record<string,string>)=>values as unknown as NodeJS.ProcessEnv;

describe('swarm profile limits',()=>{
 it('preserves the verified classic six-worker ceiling',()=>{expect(runtimeLimits(env({SWARM_PROFILE:'classic',MAX_WORKERS:'6'})).maxWorkers).toBe(6);});
 it('uses a separate expanded ceiling instead of inheriting classic MAX_WORKERS',()=>{expect(runtimeLimits(env({SWARM_PROFILE:'expanded',MAX_WORKERS:'6'})).maxWorkers).toBe(10);expect(runtimeLimits(env({SWARM_PROFILE:'expanded',MAX_WORKERS:'6',EXPANDED_MAX_WORKERS:'12'})).maxWorkers).toBe(12);});
 it('requires enough expanded capacity for the 3/2/2 worker contract',()=>{expect(()=>runtimeLimits(env({SWARM_PROFILE:'expanded',EXPANDED_MAX_WORKERS:'6'}))).toThrow('EXPANDED_MAX_WORKERS');});
});
