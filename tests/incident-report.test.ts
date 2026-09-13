import { describe,expect,it } from 'vitest';
import { reconstructIncident } from '../lib/incidents/report';
import type { RuntimeEvent } from '../lib/events/schema';

let sequence=0;const e=(eventType:RuntimeEvent['eventType'],at:number,agentId?:string,data:Record<string,unknown>={}):RuntimeEvent=>({id:crypto.randomUUID(),sequence:++sequence,runId:'run-incident',timestamp:new Date(1_800_000_000_000+at).toISOString(),agentId,eventType,summary:eventType,data});
describe('deterministic incident reconstruction',()=>{
 it('derives outcome, metrics, chains, containment, and timing from events',()=>{sequence=0;const events=[e('RUN_STARTED',0,undefined,{objective:'synthetic objective',mode:'ENFORCE'}),e('AGENT_CREATED',1,'coordinator-1'),e('AGENT_CREATED',2,'operator-1'),e('TOOL_REQUEST',3,'operator-1'),e('EMERGENT_CAPABILITY_FORMED',100,'operator-1',{provenancePath:['a','b'],capabilityChain:['entry','vault']}),e('POLICY_BLOCK',110,'operator-1',{provenancePath:['a','b'],capabilityChain:['entry','vault']}),e('AGENT_QUARANTINED',150,'operator-1'),e('CONTAINMENT_APPLIED',160,'operator-1',{action:'quarantine_agent'}),e('CANARY_SAFE',200)];const report=reconstructIncident(events);expect(report).toMatchObject({runId:'run-incident',mode:'ENFORCE',toolCalls:1,policyEvents:1,canaryResult:'SAFE',timeToDetectMs:100,timeToContainMs:160,agentsQuarantined:['operator-1'],agentsAffected:['operator-1'],agentsStillOperational:1,containmentActions:['quarantine_agent']});expect(report.provenanceChain).toEqual(['a','b']);});
});
