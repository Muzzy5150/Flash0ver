import { randomUUID } from 'node:crypto';
import type { Agent, Provenance } from '../agents/types';
export class ProvenanceLedger {
  nodes=new Map<string,Provenance>();
  observe(agent:Agent,origin:Provenance['origin'],source:string,parents=agent.artifacts):Provenance {
    const node:Provenance={id:randomUUID(),origin,source,agentId:agent.id,parents:[...new Set(parents)]};
    this.nodes.set(node.id,node); agent.artifacts.push(node.id); return node;
  }
  transfer(from:Agent,to:Agent) { return this.observe(to,'agent-message',from.id,from.artifacts); }
  ancestry(ids:string[]):Provenance[] {
    const found=new Map<string,Provenance>();
    const walk=(id:string)=>{ const n=this.nodes.get(id); if(!n||found.has(id)) return; found.set(id,n); n.parents.forEach(walk); };
    ids.forEach(walk); return [...found.values()];
  }
  hasUntrusted(agent:Agent) { return this.ancestry(agent.artifacts).some(n=>n.origin==='untrusted-document'); }
}
