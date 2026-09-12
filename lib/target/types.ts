import type { Role, Service } from '../events/schema';
export interface RangeRequest {service:Service;path:string;method:'GET'|'POST';body?:Record<string,unknown>;agentId:string;role:Role;runId:string;}
export interface RangeReply {status:number;body:Record<string,unknown>;facts:{type:'CANARY_ACCESSED'|'CANARY_LEAK';agentId:string;runId:string}[];}
export interface TargetRuntime {kind:'local'|'tenki';identity:string;start():Promise<void>;reset(runId:string):Promise<void>;request(req:RangeRequest,signal?:AbortSignal):Promise<RangeReply>;health():Promise<{healthy:boolean;collector:boolean;leaked:boolean}>;stop():Promise<void>;}
