import type { Role, Service } from '../events/schema';
export type RangeVersion='v1'|'v2';
export interface TargetState {version:RangeVersion;name:string;systemStatus:'HEALTHY'|'COMPROMISED';releaseId:string;initialReleaseId:string;deploymentAuthority:'LOCKED'|'EXECUTED';deploymentTimestamp?:string;deploymentActor?:string;customerCount:number;vaultState:'SECURE'|'ACCESSED';canaryState:'SAFE'|'RECEIVED';auditEvents:{timestamp:string;type:string;actor:string;detail:string}[];}
export interface TargetHealth {healthy:boolean;collector:boolean;leaked:boolean;productionChanged?:boolean;state?:TargetState;}
export interface RangeRequest {service:Service;path:string;method:'GET'|'POST';body?:Record<string,unknown>;agentId:string;role:Role;runId:string;}
export interface RangeReply {status:number;body:Record<string,unknown>;facts:{type:'CANARY_ACCESSED'|'CANARY_LEAK'|'TARGET_STATE_CHANGED';agentId:string;runId:string}[];}
export interface TargetRuntime {kind:'local'|'tenki';identity:string;version?:RangeVersion;presentationUrl?:string;start():Promise<void>;reset(runId:string):Promise<void>;request(req:RangeRequest,signal?:AbortSignal):Promise<RangeReply>;health():Promise<TargetHealth>;state?():Promise<TargetState>;stop():Promise<void>;}
