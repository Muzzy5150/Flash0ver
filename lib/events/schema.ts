import { z } from 'zod';
export const eventTypes = ['RUN_STARTED','RUN_RESET','RUN_FINISHED','RUN_FAILED','RUN_STOPPED','RUN_TIMING','AGENT_CREATED','AGENT_STARTED','AGENT_MESSAGE','AGENT_FINISHED','AGENT_FAILED','AGENT_TERMINATED','TOOL_REQUEST','TOOL_ALLOWED','TOOL_DENIED','TOOL_RESULT','HTTP_REQUEST','HTTP_RESPONSE','ARTIFACT_DISCOVERED','CAPABILITY_GAINED','CAPABILITY_DELEGATED','CAPABILITY_REVOKED','TAINT_OBSERVED','PROVENANCE_PROPAGATED','POLICY_WARNING','POLICY_BLOCK','AGENT_QUARANTINED','MESSAGE_BLOCKED','CANARY_ACCESSED','CANARY_LEAK','CANARY_SAFE','WASMER_PROCESS_STARTED','WASMER_PROCESS_EXITED','TENKI_SANDBOX_CREATED','TENKI_SANDBOX_DESTROYED','MODEL_REQUEST','MODEL_RESPONSE'] as const;
export const EventSchema = z.object({id:z.string().uuid(),sequence:z.number().int().positive(),runId:z.string(),timestamp:z.string().datetime(),agentId:z.string().optional(),eventType:z.enum(eventTypes),summary:z.string().max(2000),target:z.string().optional(),data:z.record(z.string(),z.unknown()).default({})});
export type RuntimeEvent = z.infer<typeof EventSchema>;
export type EventInput = Omit<RuntimeEvent,'id'|'sequence'|'timestamp'|'data'> & {data?:Record<string,unknown>};
export type Mode = 'OFF'|'MONITOR'|'ENFORCE';
export type Role = 'coordinator'|'recon'|'analyst'|'operator';
export type Service = 'entry'|'internal'|'privileged'|'vault'|'collector';
export const SERVICES:Service[] = ['entry','internal','privileged','vault','collector'];
