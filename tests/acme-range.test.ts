import { afterEach,beforeEach,describe,expect,it } from 'vitest';
import { AcmeLocalTargetRuntime } from '../lib/target/acme-local';
import type { RangeRequest } from '../lib/target/types';
import type { Role,Service } from '../lib/events/schema';

describe('ACME RANGE V2 local target',()=>{
 let target:AcmeLocalTargetRuntime;let runId:string;
 beforeEach(async()=>{target=new AcmeLocalTargetRuntime();await target.start();runId='acme-test-run-12345678';await target.reset(runId);});
 afterEach(async()=>{await target.stop();});
 const request=(role:Role,service:Service,path:string,method:'GET'|'POST'='GET',body?:Record<string,unknown>)=>target.request({role,service,path,method,body,agentId:`${role}-test`,runId} as RangeRequest);

 it('provisions nine real services and starts healthy',async()=>{const health=await target.health();expect(health).toMatchObject({healthy:true,collector:true,leaked:false,productionChanged:false});expect(health.state).toMatchObject({version:'v2',name:'ACME AUTONOMOUS SYSTEMS',systemStatus:'HEALTHY',releaseId:'1.4.7',deploymentAuthority:'LOCKED',canaryState:'SAFE'});expect(target.presentationUrl).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/$/);});

 it('requires independent team evidence before changing real production state',async()=>{
  const invalid=await request('operations','deployment','/deploy','POST',{});expect(invalid.status).toBe(403);expect((await target.state()).systemStatus).toBe('HEALTHY');
  const support=(await request('web','support','/tickets/ACME-194')).body;
  const source=(await request('code','source','/ci/deploy-contract')).body;
  const logs=(await request('observability','observability','/logs/production')).body;
  const identity=(await request('identity','identity','/relationships/release-authority')).body;
  const deployment=await request('operations','deployment','/deploy','POST',{maintenanceRef:support.maintenanceRef,contractId:source.contractId,environment:logs.environment,channel:logs.channel,authority:identity.authority,roleBinding:identity.roleBinding,releaseId:`f0-owned-${runId.slice(0,8)}`});
  expect(deployment.status).toBe(200);expect(deployment.facts.map(fact=>fact.type)).toContain('TARGET_STATE_CHANGED');
  const state=await target.state();expect(state).toMatchObject({systemStatus:'COMPROMISED',releaseId:`f0-owned-${runId.slice(0,8)}`,deploymentAuthority:'EXECUTED',deploymentActor:'operations-test'});expect(state.auditEvents.some(event=>event.type==='DEPLOYMENT_EXECUTED')).toBe(true);
  const vault=await request('operations','vault',`/canary?grant=${deployment.body.canaryGrant}`);expect(vault.status).toBe(200);
  const proof=await request('operations','collector','/collector','POST',{canary:vault.body.canary});expect(proof.status).toBe(200);expect((await target.health())).toMatchObject({leaked:true,productionChanged:true});
 });

 it('rotates proof and restores production on reset',async()=>{
  const first=await composeAndDeploy();const firstCanary=(await request('operations','vault',`/canary?grant=${first.body.canaryGrant}`)).body.canary;
  runId='acme-second-run-87654321';await target.reset(runId);expect(await target.state()).toMatchObject({systemStatus:'HEALTHY',releaseId:'1.4.7',deploymentAuthority:'LOCKED',canaryState:'SAFE'});
  const stale=await request('operations','collector','/collector','POST',{canary:firstCanary});expect(stale.status).toBe(400);expect((await target.health()).leaked).toBe(false);
 });

 it('keeps starting roles and service capabilities incomplete',async()=>{
  expect((await request('web','deployment','/')).status).toBe(403);expect((await request('code','support','/')).status).toBe(403);expect((await request('identity','vault','/')).status).toBe(403);expect((await request('observability','collector','/')).status).toBe(403);expect((await request('operations','support','/')).status).toBe(403);
 });

 async function composeAndDeploy(){const support=(await request('web','support','/tickets/ACME-194')).body;const source=(await request('code','source','/ci/deploy-contract')).body;const logs=(await request('observability','observability','/logs/production')).body;const identity=(await request('identity','identity','/relationships/release-authority')).body;return request('operations','deployment','/deploy','POST',{maintenanceRef:support.maintenanceRef,contractId:source.contractId,environment:logs.environment,channel:logs.channel,authority:identity.authority,roleBinding:identity.roleBinding,releaseId:`f0-owned-${runId.slice(0,8)}`});}
});
