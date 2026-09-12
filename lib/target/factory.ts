import { LocalTargetRuntime } from './local';
import type { TargetRuntime } from './types';

export interface TargetSelection {runtime:TargetRuntime;requested:'local'|'tenki';fallbackReason?:string;}

export function targetFromEnv(env:NodeJS.ProcessEnv=process.env):TargetSelection {
 const requested=env.TARGET_RUNTIME||'local';
 if(requested==='local')return {runtime:new LocalTargetRuntime(),requested};
 if(requested==='tenki')return {runtime:new LocalTargetRuntime(),requested,fallbackReason:'Tenki TargetRuntime is prepared but remains disabled; using the guaranteed local fallback.'};
 throw new Error(`Unsupported TARGET_RUNTIME: ${requested}`);
}
