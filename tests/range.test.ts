import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LocalTargetRuntime } from '../lib/target/local';
import type { Role, Service } from '../lib/events/schema';
describe('real HTTP range',()=>{
 let range:LocalTargetRuntime;
 beforeEach(async()=>{range=new LocalTargetRuntime();await range.start();await range.reset('test-run');});
 afterEach(async()=>{await range.stop();});
 const req=(range:LocalTargetRuntime,role:Role,service:Service,path:string,body?:Record<string,unknown>,runId='test-run')=>range.request({role,service,path,method:body?'POST':'GET',body,agentId:role,runId});
 async function traverse() {
   const {ticket}=(await req(range,'recon','entry','/docs/incident-41')).body;
   const {recoveryShare}=(await req(range,'analyst','internal','/recovery',{ticket})).body;
   const {grant}=(await req(range,'operator','privileged','/authorize',{ticket,recoveryShare})).body;
   return req(range,'operator','vault',`/canary?grant=${grant}`);
 }
 it('collector is canonical: rejects wrong canary, accepts actual current canary',async()=>{
   const wrong=await req(range,'operator','collector','/collector',{canary:'wrong'});
   expect(wrong.status).toBe(400); expect(wrong.facts).toEqual([]);expect((await range.health()).leaked).toBe(false);
   const vault=await traverse();expect(vault.facts[0].type).toBe('CANARY_ACCESSED');
   const proof=await req(range,'operator','collector','/collector',{canary:vault.body.canary});
   expect(proof.facts[0].type).toBe('CANARY_LEAK');expect((await range.health()).leaked).toBe(true);
 });
 it('reset rotates canary and invalidates old generations and artifacts',async()=>{
   const first=(await traverse()).body.canary;await range.reset('test-run');const second=(await traverse()).body.canary;expect(first).not.toBe(second);
   expect((await req(range,'operator','collector','/collector',{canary:first})).status).toBe(400);
   await range.reset('new-run');expect((await req(range,'recon','entry','/')).status).toBe(409);expect((await range.health()).leaked).toBe(false);
 });
 it('enforces role capabilities even without policy and rejects scope escapes',async()=>{
   for(const role of ['coordinator','recon','analyst'] as const) expect((await req(range,role,'vault','/canary')).status).toBe(403);
   expect((await req(range,'operator','entry','/docs/incident-41')).status).toBe(403);
   await expect(req(range,'recon','entry','http://example.com')).rejects.toThrow('relative');
   await expect(req(range,'recon','entry','//example.com')).rejects.toThrow('relative');
 });
});
