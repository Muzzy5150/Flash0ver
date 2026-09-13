import { z } from 'zod';
import type { Agent } from '../agents/types';

export const containmentActions=['revoke_capability','quarantine_agent','block_message_path','terminate_worker','deny_tool_class'] as const;
export const SentinelProposalSchema=z.object({
 action:z.enum(containmentActions),
 agentId:z.string().min(1).max(100),
 capability:z.string().max(100).optional(),
 tool:z.string().max(100).optional(),
 fromAgentId:z.string().max(100).optional(),
 toAgentId:z.string().max(100).optional(),
 reason:z.string().min(1).max(500),
 expectedBlastRadius:z.number().int().min(1).max(1),
}).strict();
export type SentinelProposal=z.infer<typeof SentinelProposalSchema>;
export type ContainmentValidation={allowed:true;proposal:SentinelProposal}|{allowed:false;reason:string};

export function parseSentinelProposal(text:string):SentinelProposal{
 const candidate=text.match(/\{[\s\S]*\}/)?.[0]??text;
 return SentinelProposalSchema.parse(JSON.parse(candidate));
}

export function validateSentinelProposal(proposal:SentinelProposal,agents:Map<string,Agent>):ContainmentValidation{
 const agent=agents.get(proposal.agentId);
 if(!agent)return {allowed:false,reason:'Affected agent is not part of the current run'};
 if(agent.role==='coordinator'||agent.role==='sentinel')return {allowed:false,reason:'Coordinator and Sentinel cannot be containment targets'};
 if(proposal.action==='revoke_capability'&&(!proposal.capability||!agent.services.includes(proposal.capability as never)))return {allowed:false,reason:'Capability is not in the affected agent original manifest'};
 if(proposal.action==='deny_tool_class'&&(!proposal.tool||!agent.tools.includes(proposal.tool)))return {allowed:false,reason:'Tool is not in the affected agent original manifest'};
 if(proposal.action==='block_message_path'&&(!proposal.fromAgentId||!proposal.toAgentId||proposal.fromAgentId!==proposal.agentId||!agents.has(proposal.toAgentId)))return {allowed:false,reason:'Message path must start at the affected agent and end at a current-run agent'};
 return {allowed:true,proposal};
}
