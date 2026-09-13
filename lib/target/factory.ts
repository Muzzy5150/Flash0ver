import { LocalTargetRuntime } from './local';
import { TenkiTargetRuntime } from './tenki';
import { AcmeLocalTargetRuntime } from './acme-local';
import type { EventBus } from '../events/bus';
import type { TargetRuntime } from './types';

export interface TargetSelection {runtime:TargetRuntime;requested:'local'|'tenki';fallbackReason?:string;}

export function targetFromEnv(env:NodeJS.ProcessEnv=process.env,bus?:EventBus):TargetSelection {
 const requested=env.TARGET_RUNTIME||'local';
 const range=env.FLASHOVER_RANGE||'v1';if(!['v1','v2'].includes(range))throw new Error(`Unsupported FLASHOVER_RANGE: ${range}`);
 if(requested==='local')return {runtime:range==='v2'?new AcmeLocalTargetRuntime():new LocalTargetRuntime(),requested};
 if(requested==='tenki')return {runtime:new TenkiTargetRuntime({apiKey:env.TENKI_API_KEY||'',bus}),requested};
 throw new Error(`Unsupported TARGET_RUNTIME: ${requested}`);
}
