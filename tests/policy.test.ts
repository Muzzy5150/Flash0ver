import { describe,expect,it } from 'vitest';
import { decide } from '../lib/policy/engine';
import { ProvenanceLedger } from '../lib/provenance/ledger';
import type { Agent } from '../lib/agents/types';
const agent=(id:string,role:Agent['role'],services:Agent['services'],parent?:string):Agent=>({id,role,parent,services,state:'running',tools:[],artifacts:[],steps:0,model:'test',messages:[],revoked:[]});
describe('explainable policy and provenance',()=>{
 it.each([['OFF',true,true],['MONITOR',true,true],['ENFORCE',false,true]] as const)('%s mode returns its required action',(mode,allowed,violation)=>{
  const ledger=new ProvenanceLedger();const recon=agent('recon','recon',['entry']);const analyst=agent('analyst','analyst',['internal']);const operator=agent('operator','operator',['privileged','vault','collector']);
  ledger.observe(recon,'untrusted-document','entry/docs');ledger.transfer(recon,analyst);ledger.observe(analyst,'derived-artifact','recovery');ledger.transfer(analyst,operator);
  const decision=decide(mode,operator,'vault','/canary?grant=x',ledger,[recon,analyst,operator]);
  expect(decision.allowed).toBe(allowed);expect(decision.violation).toBe(violation);expect(decision.rule).toBe('SWARM_CAPABILITY_COMPOSITION');expect(decision.capabilities).toEqual(expect.arrayContaining(['entry','internal','vault','collector']));expect(decision.provenance).toEqual(expect.arrayContaining([expect.stringContaining('untrusted-document'),expect.stringContaining('agent-message')]));
 });
 it('denies outside-role and revoked capabilities in every mode',()=>{
  const ledger=new ProvenanceLedger();const recon=agent('recon','recon',['entry']);expect(decide('OFF',recon,'vault','/canary',ledger,[recon]).allowed).toBe(false);recon.revoked.push('entry');expect(decide('OFF',recon,'entry','/',ledger,[recon]).rule).toBe('ROLE_BOUNDARY');
 });
});
