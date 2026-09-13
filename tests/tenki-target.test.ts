import { describe,expect,it } from 'vitest';
import { EventBus } from '../lib/events/bus';
import { TenkiTargetRuntime,validateTenkiBaseUrl } from '../lib/target/tenki';

class MockSession {
 id='sbx_flash0ver';state='RUNNING';closed=0;unexposed=0;written='';commands:unknown[]=[];
 async exec(command:unknown,options?:unknown){this.commands.push([command,options]);return {status:'SUCCEEDED',exitCode:0,stderr:new Uint8Array()};}
 async writeFile(_path:string,data:string|Uint8Array){this.written=String(data);}
 async exposePort(){return {previewUrl:'https://sbx-flash0ver.preview.example/'};}
 async unexposePort(){this.unexposed++;}
 async close(){this.closed++;this.state='TERMINATED';}
 async refresh(){}
}
class MockClient {
 closed=0;created?:Record<string,unknown>;
 constructor(readonly session=new MockSession(),readonly authError?:Error){}
 async whoAmI(){if(this.authError)throw this.authError;return {workspaces:[{}]};}
 async create(options:Record<string,unknown>){this.created=options;return this.session;}
 close(){this.closed++;}
}
const reply=(status:number,body:Record<string,unknown>,facts:unknown[]=[])=>new Response(JSON.stringify({status,body,facts}),{status:200,headers:{'content-type':'application/json'}});
const fakeFetch=(async(input:URL|RequestInfo,init?:RequestInit)=>{
 const url=new URL(String(input));
 if(url.pathname==='/control/health')return reply(200,{healthy:true,collector:true,services:5,leaked:false});
 if(url.pathname==='/control/reset')return reply(200,{reset:true,leaked:false});
 expect(url.origin).toBe('https://sbx-flash0ver.preview.example');expect(url.pathname).toBe('/range/entry/');expect(init?.redirect).toBe('error');
 return reply(200,{name:'Ember Support'});
}) as typeof fetch;
const v2State={version:'v2',name:'ACME AUTONOMOUS SYSTEMS',systemStatus:'HEALTHY',releaseId:'1.4.7',initialReleaseId:'1.4.7',deploymentAuthority:'LOCKED',customerCount:12847,vaultState:'SECURE',canaryState:'SAFE',auditEvents:[]};
const fakeV2Fetch=(async(input:URL|RequestInfo)=>{
 const url=new URL(String(input));
 if(url.pathname==='/control/health')return reply(200,{healthy:true,collector:true,services:9,leaked:false,state:v2State});
 if(url.pathname==='/control/state')return reply(200,{state:v2State});
 return reply(200,{reset:true,leaked:false,state:v2State});
}) as typeof fetch;

describe('Tenki target runtime',()=>{
 it('authenticates, provisions a confined range, resets, and destroys idempotently',async()=>{
  const bus=new EventBus();const client=new MockClient();const target=new TenkiTargetRuntime({apiKey:'tk_test_secret_value',bus,clientFactory:()=>client,fetcher:fakeFetch});
  await target.start();expect(client.created).toMatchObject({allowInbound:true,allowOutbound:false,metadata:{project:'flash0ver'}});expect(client.session.written).toContain('FLASH0VER Tenki range ready');
  await target.reset('run-one');expect((await target.health()).leaked).toBe(false);
  const result=await target.request({service:'entry',path:'/',method:'GET',role:'recon',agentId:'recon-1',runId:'run-one'});expect(result.status).toBe(200);
  await target.stop();await target.stop();expect(client.session.closed).toBe(1);expect(client.session.unexposed).toBe(1);expect(client.closed).toBe(1);
  expect(bus.list().map(event=>event.eventType)).toEqual(expect.arrayContaining(['TENKI_AUTH_OK','TENKI_SANDBOX_CREATED','TENKI_PROVISION_STARTED','TENKI_PROVISION_READY','TENKI_RESET','TENKI_SANDBOX_DESTROYED']));
  expect(JSON.stringify(bus.list())).not.toContain('tk_test_secret_value');bus.close();
 });
 it('records a redacted auth failure and never creates a sandbox',async()=>{
  const secret='tk_invalid_secret_value';const bus=new EventBus();const client=new MockClient(new MockSession(),new Error(`unauthorized ${secret}`));const target=new TenkiTargetRuntime({apiKey:secret,bus,clientFactory:()=>client,fetcher:fakeFetch});
  await expect(target.start()).rejects.toThrow('[REDACTED]');expect(client.created).toBeUndefined();expect(client.closed).toBe(1);expect(JSON.stringify(bus.list())).not.toContain(secret);expect(bus.list().at(-1)?.eventType).toBe('TENKI_AUTH_FAILED');bus.close();
 });
 it('provisions the separate ACME V2 service and exposes target truth',async()=>{
  const client=new MockClient();const target=new TenkiTargetRuntime({apiKey:'tk_test',version:'v2',clientFactory:()=>client,fetcher:fakeV2Fetch});
  await target.start();expect(client.session.written).toContain('Tenki ACME Range V2');expect(target.presentationUrl).toBe('https://sbx-flash0ver.preview.example/production');
  expect(await target.health()).toMatchObject({healthy:true,collector:true,leaked:false,productionChanged:false,state:v2State});expect(await target.state()).toEqual(v2State);await target.stop();
 });
 it('cleans up a created sandbox when provisioning fails',async()=>{
  class BadUrlSession extends MockSession {async exposePort(){return {previewUrl:'http://127.0.0.1:4311/'};}}
  const session=new BadUrlSession();const client=new MockClient(session);const target=new TenkiTargetRuntime({apiKey:'tk_test',clientFactory:()=>client,fetcher:fakeFetch});
  await expect(target.start()).rejects.toThrow('failed validation');expect(session.closed).toBe(1);expect(client.closed).toBe(1);await target.stop();expect(session.closed).toBe(1);
 });
 it('rejects unsafe exposed range URLs',()=>{
  expect(validateTenkiBaseUrl('https://range.preview.example/')).toBe('https://range.preview.example');
  for(const url of ['http://range.preview.example/','https://user:pass@range.preview.example/','https://range.preview.example:8443/','https://range.preview.example/path','https://range.preview.example/?next=evil','https://localhost/'])expect(()=>validateTenkiBaseUrl(url)).toThrow('failed validation');
 });
});
