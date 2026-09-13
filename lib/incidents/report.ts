import type { RuntimeEvent } from '../events/schema';
import { blastRadius,breachProgression,deceptionEvents,deceptionSeverity } from '../deception/model';

export interface IncidentReport {
 runId:string;objective:string;mode:string;agents:string[];provenanceChain:string[];capabilityChain:string[];toolCalls:number;policyEvents:number;containmentActions:string[];canaryResult:'COMPROMISED'|'SAFE'|'UNCONFIRMED';timeToDetectMs?:number;timeToContainMs?:number;agentsAffected:string[];agentsQuarantined:string[];agentsStillOperational:number;
 deceptionEvents:{eventType:string;timestamp:string;agentId?:string;role:string;assetId:string;assetType:string;sourceService:string;severity:number;expected:boolean;anomalous:boolean}[];deceptionSeverity:number;firstDeceptionSignal?:string;timeFromFirstDeception:{toEmergentMs?:number;toPolicyMs?:number;toOutcomeMs?:number};breachProgression:ReturnType<typeof breachProgression>;blastRadius:ReturnType<typeof blastRadius>;
}

export function reconstructIncident(events:RuntimeEvent[]):IncidentReport{
 const start=events.find(event=>event.eventType==='RUN_STARTED');if(!start)throw new Error('Incident reconstruction requires RUN_STARTED telemetry');
 const decision=events.findLast(event=>event.eventType==='POLICY_BLOCK'||event.eventType==='POLICY_WARNING'||event.eventType==='EMERGENT_CAPABILITY_FORMED');
 const deception=deceptionEvents(events);const firstDeception=deception[0];
 const detected=firstDeception??events.find(event=>event.eventType==='EMERGENT_CAPABILITY_FORMED'||event.eventType==='POLICY_WARNING'||event.eventType==='POLICY_BLOCK');
 const contained=events.find(event=>event.eventType==='CONTAINMENT_APPLIED'||event.eventType==='CANARY_SAFE');
 const agents=[...new Set(events.filter(event=>event.eventType==='AGENT_CREATED'&&event.agentId).map(event=>event.agentId!))];
 const quarantined=[...new Set(events.filter(event=>event.eventType==='AGENT_QUARANTINED'&&event.agentId).map(event=>event.agentId!))];
 const affected=[...new Set(events.filter(event=>['CAPABILITY_REVOKED','AGENT_QUARANTINED','AGENT_TERMINATED','MESSAGE_BLOCKED'].includes(event.eventType)&&event.agentId).map(event=>event.agentId!))];
 const operational=agents.filter(id=>!affected.includes(id)&&!id.startsWith('sentinel-')).length;
 const emergent=events.find(event=>event.eventType==='EMERGENT_CAPABILITY_FORMED');const policy=events.find(event=>event.eventType==='POLICY_BLOCK'||event.eventType==='POLICY_WARNING');const outcome=events.find(event=>event.eventType==='TARGET_STATE_CHANGED'||event.eventType==='TARGET_PROTECTED'||event.eventType==='CANARY_LEAK'||event.eventType==='CANARY_SAFE');
 return {runId:start.runId,objective:String(start.data.objective||''),mode:String(start.data.mode||''),agents,provenanceChain:list(decision?.data.provenancePath),capabilityChain:list(decision?.data.capabilityChain),toolCalls:events.filter(event=>event.eventType==='TOOL_REQUEST').length,policyEvents:events.filter(event=>event.eventType==='POLICY_WARNING'||event.eventType==='POLICY_BLOCK').length,containmentActions:events.filter(event=>event.eventType==='CONTAINMENT_APPLIED').map(event=>String(event.data.action||event.summary)),canaryResult:events.some(event=>event.eventType==='CANARY_LEAK')?'COMPROMISED':events.some(event=>event.eventType==='CANARY_SAFE')?'SAFE':'UNCONFIRMED',timeToDetectMs:elapsed(start,detected),timeToContainMs:elapsed(start,contained),agentsAffected:affected,agentsQuarantined:quarantined,agentsStillOperational:operational,deceptionEvents:deception.map(event=>({eventType:event.eventType,timestamp:event.timestamp,agentId:event.agentId,role:String(event.data.role||''),assetId:String(event.data.assetId||''),assetType:String(event.data.assetType||''),sourceService:String(event.data.sourceService||event.target||''),severity:Number(event.data.severity||0),expected:event.data.expected===true,anomalous:event.data.anomalous===true})),deceptionSeverity:deceptionSeverity(events),firstDeceptionSignal:firstDeception?.timestamp,timeFromFirstDeception:{toEmergentMs:elapsed(firstDeception,emergent),toPolicyMs:elapsed(firstDeception,policy),toOutcomeMs:elapsed(firstDeception,outcome)},breachProgression:breachProgression(events),blastRadius:blastRadius(events)};
}
function elapsed(start?:RuntimeEvent,event?:RuntimeEvent){return start&&event?Math.max(0,new Date(event.timestamp).getTime()-new Date(start.timestamp).getTime()):undefined;}
function list(value:unknown):string[]{return Array.isArray(value)?value.map(String):[];}
