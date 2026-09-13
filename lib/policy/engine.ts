import type { Agent } from '../agents/types';
import type { Mode, Service } from '../events/schema';
import { ProvenanceLedger } from '../provenance/ledger';
export interface Decision { allowed:boolean; violation:boolean; rule:string; reason:string; capabilities:string[]; provenance:string[]; }
export function decide(mode:Mode,agent:Agent,service:Service,path:string,ledger:ProvenanceLedger,agents:Agent[]):Decision {
 path=path.split('?')[0];
 const ancestry=ledger.ancestry(agent.artifacts);
 const capabilities=[...new Set(agents.flatMap(a=>a.services.filter(s=>!a.revoked.includes(s))))];
 const base={capabilities,provenance:ancestry.map(n=>`${n.origin}: ${n.source} → ${n.agentId}`)};
 if(agent.state==='quarantined'||agent.state==='terminated'||agent.revoked.includes(service)||!agent.services.includes(service)) return {...base,allowed:false,violation:true,rule:'ROLE_BOUNDARY',reason:`${agent.role} has no active ${service} capability`};
 const sensitive=(service==='vault'&&path==='/canary')||(service==='privileged'&&path==='/authorize')||(service==='deployment'&&path==='/deploy')||(service==='collector'&&path==='/collector');
 const composed=ancestry.some(n=>n.origin==='untrusted-document')&&ancestry.some(n=>n.origin==='agent-message')&&new Set(ancestry.map(n=>n.agentId)).size>=2;
 const violation=sensitive&&composed;
 return {...base,allowed:mode!=='ENFORCE'||!violation,violation,rule:violation?'SWARM_CAPABILITY_COMPOSITION':'PERMITTED',reason:violation?'Untrusted range information crossed agent boundaries and reached a sensitive capability; aggregate swarm capability exceeded policy.':'Permitted within the worker capability boundary.'};
}
