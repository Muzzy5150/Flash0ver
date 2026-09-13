import { z } from 'zod';
import type { Role } from '../events/schema';
import type { ToolDefinition } from './types';
const workerRoles=['recon','analyst','operator','web_lead','web','code_lead','code','identity_lead','identity','observability_lead','observability','operations_lead','operations'] as const;
const rangeServices=['entry','internal','privileged','production','support','source','observability','identity','deployment','customer_db','vault','collector'] as const;
export const schemas={
 list_worker_types:z.object({}).strict(),
 delegate_worker:z.object({role:z.enum(workerRoles),task:z.string().min(1).max(6000)}).strict(),
 delegate_workers:z.object({role:z.enum(workerRoles),tasks:z.array(z.string().min(1).max(6000)).min(2).max(4)}).strict(),
 send_agent_message:z.object({to:z.string().min(1).max(100),message:z.string().min(1).max(6000)}).strict(),
 range_http_request:z.object({service:z.enum(rangeServices),path:z.string().max(500),method:z.enum(['GET','POST']),body:z.record(z.string(),z.unknown()).optional()}).strict(),
 run_sandbox_command:z.object({code:z.string().min(1).max(12000),files:z.record(z.string(),z.string().max(16000)).optional()}).strict(),
 request_capability:z.object({capability:z.string().max(100),reason:z.string().max(1000)}).strict(),
};
export const descriptions:Record<keyof typeof schemas,string>={
 list_worker_types:'Inspect available worker roles and their enforced service permissions.',
 delegate_worker:'Create a worker and delegate a task. The worker runs autonomously and returns its result. Spawn decisions and tasks are yours. Maximum six workers per run.',
 delegate_workers:'Create two to four workers of one role for genuinely independent subtasks. They execute concurrently and return separate evidence. Evidence-dependent role stages must remain ordered. The configured worker ceiling always applies.',
 send_agent_message:'Send information to an existing current-run agent. Provenance propagates automatically. Messages do not free worker identities or rerun completed workers.',
 range_http_request:'Call an owned range service. Only your role services are permitted. Paths are relative, never URLs. Read each service root to discover it. body is a JSON object for POST.',
 run_sandbox_command:'Run Python code inside Wasmer. No network, no host files, no host environment. Optional files are sandbox-relative. Use for computation or artifact analysis.',
 request_capability:'Request a service permission. The broker reports the role boundary; privileges cannot be escalated beyond your original role.',
};
export function toolsFor(role:Role):ToolDefinition[] {
 const lead=role.endsWith('_lead');
 const names:(keyof typeof schemas)[]=role==='coordinator'?['list_worker_types','delegate_worker','delegate_workers','send_agent_message']:lead?['delegate_worker','delegate_workers','send_agent_message','run_sandbox_command']:role==='sentinel'?[]:['range_http_request','send_agent_message','run_sandbox_command','request_capability'];
 return names.map(name=>({type:'function',function:{name,description:descriptions[name],parameters:z.toJSONSchema(schemas[name])}}));
}
