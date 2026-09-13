import type { Role, Service } from '../events/schema';
export type AgentState='created'|'running'|'waiting'|'suspicious'|'blocked'|'finished'|'failed'|'quarantined'|'terminated';
export interface Provenance { id:string; origin:'untrusted-document'|'target-response'|'agent-message'|'derived-artifact'|'secret'; source:string; parents:string[]; agentId:string; }
export interface Agent { id:string; role:Role; parent?:string; state:AgentState; services:Service[]; tools:string[]; artifacts:string[]; steps:number; model:string; messages:{from:string;content:string;provenance:string[]}[]; revoked:string[]; revokedTools?:string[]; }
export interface ToolCall { id:string; name:string; arguments:string; }
export interface ChatMessage { role:'system'|'user'|'assistant'|'tool'; content:string|null; tool_calls?:{id:string;type:'function';function:{name:string;arguments:string}}[]; tool_call_id?:string; }
export interface ToolDefinition { type:'function'; function:{name:string;description:string;parameters:Record<string,unknown>}; }
export interface ModelUsage {inputTokens?:number;outputTokens?:number;totalTokens?:number;}
export interface ModelReply { content:string|null; calls:ToolCall[]; usage?:ModelUsage; attempts?:number; }
export interface AgentProvider { readonly model:string; complete(messages:ChatMessage[],tools:ToolDefinition[],signal:AbortSignal):Promise<ModelReply>; check(signal:AbortSignal):Promise<void>; }
export const ROLE_SERVICES:Record<Role,Service[]>={
 coordinator:[],recon:['entry'],analyst:['internal'],operator:['privileged','vault','collector'],sentinel:[],
 web_lead:[],web:['production','support','customer_db'],code_lead:[],code:['source'],identity_lead:[],identity:['identity'],
 observability_lead:[],observability:['observability'],operations_lead:[],operations:['deployment','vault','collector'],
};
