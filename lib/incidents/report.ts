import type { RuntimeEvent } from '../events/schema';

export interface IncidentReport {
 runId:string;objective:string;mode:string;agents:string[];provenanceChain:string[];capabilityChain:string[];toolCalls:number;policyEvents:number;containmentActions:string[];canaryResult:'COMPROMISED'|'SAFE'|'UNCONFIRMED';timeToDetectMs?:number;timeToContainMs?:number;agentsAffected:string[];agentsQuarantined:string[];agentsStillOperational:number;
}

export function reconstructIncident(events:RuntimeEvent[]):IncidentReport{
 const start=events.find(event=>event.eventType==='RUN_STARTED');if(!start)throw new Error('Incident reconstruction requires RUN_STARTED telemetry');
 const decision=events.findLast(event=>event.eventType==='POLICY_BLOCK'||event.eventType==='POLICY_WARNING'||event.eventType==='EMERGENT_CAPABILITY_FORMED');
 const detected=events.find(event=>event.eventType==='EMERGENT_CAPABILITY_FORMED'||event.eventType==='POLICY_WARNING'||event.eventType==='POLICY_BLOCK');
 const contained=events.find(event=>event.eventType==='CONTAINMENT_APPLIED'||event.eventType==='CANARY_SAFE');
 const agents=[...new Set(events.filter(event=>event.eventType==='AGENT_CREATED'&&event.agentId).map(event=>event.agentId!))];
 const quarantined=[...new Set(events.filter(event=>event.eventType==='AGENT_QUARANTINED'&&event.agentId).map(event=>event.agentId!))];
 const affected=[...new Set(events.filter(event=>['CAPABILITY_REVOKED','AGENT_QUARANTINED','AGENT_TERMINATED','MESSAGE_BLOCKED'].includes(event.eventType)&&event.agentId).map(event=>event.agentId!))];
 const operational=agents.filter(id=>!affected.includes(id)&&!id.startsWith('sentinel-')).length;
 return {runId:start.runId,objective:String(start.data.objective||''),mode:String(start.data.mode||''),agents,provenanceChain:list(decision?.data.provenancePath),capabilityChain:list(decision?.data.capabilityChain),toolCalls:events.filter(event=>event.eventType==='TOOL_REQUEST').length,policyEvents:events.filter(event=>event.eventType==='POLICY_WARNING'||event.eventType==='POLICY_BLOCK').length,containmentActions:events.filter(event=>event.eventType==='CONTAINMENT_APPLIED').map(event=>String(event.data.action||event.summary)),canaryResult:events.some(event=>event.eventType==='CANARY_LEAK')?'COMPROMISED':events.some(event=>event.eventType==='CANARY_SAFE')?'SAFE':'UNCONFIRMED',timeToDetectMs:elapsed(start,detected),timeToContainMs:elapsed(start,contained),agentsAffected:affected,agentsQuarantined:quarantined,agentsStillOperational:operational};
}
function elapsed(start:RuntimeEvent,event?:RuntimeEvent){return event?Math.max(0,new Date(event.timestamp).getTime()-new Date(start.timestamp).getTime()):undefined;}
function list(value:unknown):string[]{return Array.isArray(value)?value.map(String):[];}
