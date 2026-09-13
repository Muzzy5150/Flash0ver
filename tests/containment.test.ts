import { describe,expect,it } from 'vitest';
import type { Agent } from '../lib/agents/types';
import { parseSentinelProposal,validateSentinelProposal } from '../lib/containment/sentinel';

const operator:Agent={id:'operator-01',role:'operator',parent:'coordinator-01',state:'running',services:['privileged','vault','collector'],tools:['range_http_request'],artifacts:[],steps:1,model:'test',messages:[],revoked:[],revokedTools:[]};
const agents=new Map<string,Agent>([[operator.id,operator]]);
describe('deterministic Sentinel proposal validation',()=>{
 it('accepts one-agent quarantine with a bounded blast radius',()=>{const proposal=parseSentinelProposal(JSON.stringify({action:'quarantine_agent',agentId:operator.id,reason:'Composed provenance reached a denied sensitive action.',expectedBlastRadius:1}));expect(validateSentinelProposal(proposal,agents)).toMatchObject({allowed:true});});
 it('rejects capability changes outside the original manifest',()=>{const proposal=parseSentinelProposal(JSON.stringify({action:'revoke_capability',agentId:operator.id,capability:'entry',reason:'Invalid broad proposal.',expectedBlastRadius:1}));expect(validateSentinelProposal(proposal,agents)).toMatchObject({allowed:false});});
 it('cannot express a capability grant or a multi-agent blast radius',()=>{expect(()=>parseSentinelProposal(JSON.stringify({action:'grant_capability',agentId:operator.id,capability:'entry',reason:'not allowed',expectedBlastRadius:1}))).toThrow();expect(()=>parseSentinelProposal(JSON.stringify({action:'quarantine_agent',agentId:operator.id,reason:'too broad',expectedBlastRadius:2}))).toThrow();});
});
