import type { RuntimeEvent } from './schema';

export type IncidentCategory='activity'|'message'|'evidence'|'warning'|'block'|'containment'|'outcome'|'failure';
export interface IncidentLine {sourceEventId:string;timestamp:string;actor:string;category:IncidentCategory;text:string;}

export function narrateEvent(event:RuntimeEvent):IncidentLine|null{
 const actor=event.eventType==='DECEPTION_ESCALATED'?actorFor(event.eventType):event.agentId??actorFor(event.eventType);let category:IncidentCategory='activity';let text=event.summary;
 switch(event.eventType){
  case 'AGENT_CREATED':text=`spawned ${event.agentId}`;break;
  case 'AGENT_STARTED':text=`started ${String(event.data.role||role(event.agentId))} assignment`;break;
  case 'AGENT_WAITING':text=event.summary;break;
  case 'AGENT_MESSAGE':category='message';text=event.target?`→ ${event.target} evidence handoff`:event.summary;break;
  case 'HTTP_REQUEST':text=`requested ${event.summary}`;break;
  case 'ARTIFACT_DISCOVERED':case 'TAINT_OBSERVED':category='evidence';text=event.summary;break;
  case 'PROVENANCE_PROPAGATED':category='evidence';text=event.summary;break;
  case 'DECEPTION_ASSET_ACCESSED':case 'DECEPTION_FILE_ACCESSED':case 'DECOY_RECORD_ACCESSED':category='warning';text=`DECEPTION TRIPWIRE · ${event.summary}`;break;
  case 'DECEPTION_IDENTITY_TOUCHED':category='warning';text=`IDENTITY TRIPWIRE · ${event.summary}`;break;
  case 'DECEPTION_CREDENTIAL_USED':category='block';text=`CREDENTIAL TRIPWIRE · ${event.summary}`;break;
  case 'DECEPTION_ESCALATED':category='warning';text=`THREAT LEVEL ${String(event.data.previousLevel)} → ${String(event.data.severityLevel)}`;break;
  case 'EMERGENT_CAPABILITY_FORMED':category='warning';text='emergent capability detected from distributed provenance';break;
  case 'POLICY_WARNING':category='warning';text=`WARN / ALLOW · ${event.summary}`;break;
  case 'POLICY_BLOCK':case 'ATTACK_PATH_BLOCKED':category='block';text=event.eventType==='POLICY_BLOCK'?`DENY · ${event.summary}`:event.summary;break;
  case 'SENTINEL_PROPOSAL':category='warning';text='minimal containment plan proposed';break;
  case 'SENTINEL_PROPOSAL_REJECTED':case 'AGENT_FAILED':case 'RUN_FAILED':case 'RUN_STOPPED':category='failure';break;
  case 'CAPABILITY_REVOKED':case 'AGENT_QUARANTINED':case 'MESSAGE_BLOCKED':case 'CONTAINMENT_APPLIED':case 'ATTACK_EXHAUSTED':category='containment';break;
  case 'CANARY_LEAK':category='outcome';text='current canary received by collector';break;
  case 'CANARY_SAFE':category='containment';text='collector confirmed current run clean';break;
  case 'TARGET_STATE_CHANGED':category='outcome';text='ACME production deployment executed — target state changed';break;
  case 'TARGET_PROTECTED':category='containment';text='ACME production remained healthy and unchanged';break;
  default:if(!VISIBLE.has(event.eventType))return null;
 }
 return {sourceEventId:event.id,timestamp:event.timestamp,actor,category,text};
}
export function narrateEvents(events:RuntimeEvent[]){return events.map(narrateEvent).filter((line):line is IncidentLine=>line!==null);}
const VISIBLE=new Set(['RUN_STARTED','RUN_FINISHED','AGENT_FINISHED','TOOL_REQUEST','TOOL_DENIED','CANARY_ACCESSED','ATTACK_PATH_STARTED','INCIDENT_REPORT_CREATED']);
function actorFor(type:string){if(type==='DECEPTION_ESCALATED')return 'THREAT';if(type.startsWith('DECEPTION_')||type.startsWith('DECOY_'))return 'FLASH0VER';if(type.startsWith('POLICY_'))return 'POLICY';if(type.startsWith('SENTINEL_'))return 'SENTINEL';if(type.startsWith('CANARY_'))return 'COLLECTOR';if(type.startsWith('ATTACK_'))return 'FLASH0VER';return 'FLASH0VER';}
function role(id?:string){return id?.split('-')[0]??'agent';}
