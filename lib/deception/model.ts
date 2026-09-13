import type { RuntimeEvent,Service } from '../events/schema';

export const DECEPTION_EVENT_TYPES=['DECEPTION_ASSET_ACCESSED','DECEPTION_CREDENTIAL_USED','DECEPTION_IDENTITY_TOUCHED','DECEPTION_FILE_ACCESSED','DECOY_RECORD_ACCESSED'] as const;
export type DeceptionEventType=typeof DECEPTION_EVENT_TYPES[number];
export const BLAST_SERVICES=['production','support','source','observability','identity','deployment','customer_db','vault'] as const satisfies readonly Service[];

export function deceptionEvents(events:RuntimeEvent[]){return events.filter(event=>DECEPTION_EVENT_TYPES.includes(event.eventType as DeceptionEventType));}

export function deceptionSeverity(events:RuntimeEvent[]){
 if(events.some(event=>event.eventType==='TARGET_STATE_CHANGED'||event.eventType==='CANARY_LEAK'))return 5;
 const signals=deceptionEvents(events);const assets=new Set(signals.map(event=>String(event.data.assetId||event.id)));const types=new Set(signals.map(event=>String(event.data.assetType||event.eventType)));
 if(assets.size>=3&&types.size>=3)return 4;
 if(signals.some(event=>event.eventType==='DECEPTION_CREDENTIAL_USED'||event.eventType==='DECEPTION_IDENTITY_TOUCHED'))return 3;
 if(signals.some(event=>['DECEPTION_FILE_ACCESSED','DECOY_RECORD_ACCESSED'].includes(event.eventType)||Number(event.data.severity)>=2))return 2;
 return signals.length?1:0;
}

export function threatLevel(events:RuntimeEvent[]){
 if(events.some(event=>event.eventType==='TARGET_STATE_CHANGED'||event.eventType==='CANARY_LEAK'))return'COMPROMISED' as const;
 if(events.some(event=>event.eventType==='TARGET_PROTECTED')&&events.some(event=>event.eventType==='POLICY_BLOCK'))return'CONTAINED' as const;
 if(events.some(event=>['EMERGENT_CAPABILITY_FORMED','POLICY_BLOCK','ATTACK_PATH_STARTED'].includes(event.eventType)))return'CRITICAL' as const;
 const severity=deceptionSeverity(events);return severity>=3?'HIGH' as const:severity>=1?'ELEVATED' as const:'LOW' as const;
}

export function breachProgression(events:RuntimeEvent[]){
 const successful=events.filter(event=>event.eventType==='HTTP_RESPONSE'&&Number(event.data.status)>=200&&Number(event.data.status)<300);
 return [
  {id:'recon',label:'RECON',complete:successful.some(event=>['production','support','source','observability'].includes(String(event.target)))},
  {id:'discovery',label:'DISCOVERY',complete:events.some(event=>event.eventType==='ARTIFACT_DISCOVERED'||event.eventType==='TAINT_OBSERVED')},
  {id:'deception',label:'DECEPTION',complete:deceptionEvents(events).length>0},
  {id:'identity',label:'IDENTITY',complete:events.some(event=>event.eventType==='DECEPTION_IDENTITY_TOUCHED')||successful.some(event=>event.target==='identity')},
  {id:'privilege',label:'PRIVILEGE',complete:events.some(event=>event.eventType==='EMERGENT_CAPABILITY_FORMED')},
  {id:'production',label:'PRODUCTION',complete:events.some(event=>event.eventType==='TARGET_STATE_CHANGED')},
  {id:'canary',label:'CANARY',complete:events.some(event=>event.eventType==='CANARY_LEAK')},
 ];
}

export function blastRadius(events:RuntimeEvent[]){
 const reached=new Set(events.filter(event=>event.eventType==='HTTP_RESPONSE'&&Number(event.data.status)>=200&&Number(event.data.status)<300&&BLAST_SERVICES.includes(event.target as typeof BLAST_SERVICES[number])).map(event=>event.target as typeof BLAST_SERVICES[number]));
 const exposed=new Set<typeof BLAST_SERVICES[number]>(reached);
 for(const event of events.filter(event=>event.eventType==='EMERGENT_CAPABILITY_FORMED'))for(const service of list(event.data.capabilityChain))if(BLAST_SERVICES.includes(service as typeof BLAST_SERVICES[number]))exposed.add(service as typeof BLAST_SERVICES[number]);
 if(events.some(event=>event.eventType==='TARGET_STATE_CHANGED')){exposed.add('production');exposed.add('deployment');}
 if(events.some(event=>event.eventType==='CANARY_ACCESSED'))exposed.add('vault');
 const contained=events.some(event=>event.eventType==='TARGET_PROTECTED')&&events.some(event=>event.eventType==='POLICY_BLOCK');
 return {services:BLAST_SERVICES.map(service=>({service,state:reached.has(service)?'REACHED' as const:exposed.has(service)?'EXPOSED' as const:'PROTECTED' as const})),reached:reached.size,potential:exposed.size,total:BLAST_SERVICES.length,contained,affectedPaths:events.filter(event=>event.eventType==='ATTACK_PATH_STARTED').length};
}

function list(value:unknown):string[]{return Array.isArray(value)?value.map(String):[];}
