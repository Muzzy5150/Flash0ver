import { randomBytes } from 'node:crypto';
import { AcmeRangeCluster } from '../../range/services/acme';
import { ACME_SERVICES } from '../events/schema';
import type { RangeReply,RangeRequest,TargetRuntime } from './types';
import { validatePath } from './local';

export class AcmeLocalTargetRuntime implements TargetRuntime {
 readonly kind='local' as const;readonly version='v2' as const;identity='localhost · ACME RANGE V2';presentationUrl?:string;
 private token=randomBytes(32).toString('hex');private cluster=new AcmeRangeCluster(this.token);
 async start(){await this.cluster.start();this.presentationUrl=this.cluster.productionUrl;this.identity=`localhost · ACME RANGE V2 · ${ACME_SERVICES.length} HTTP services`;}
 async reset(runId:string){this.cluster.reset(runId);}
 async request(req:RangeRequest,signal?:AbortSignal):Promise<RangeReply>{validatePath(req.path);const port=this.cluster.ports[req.service];if(!port)throw new Error('Service is not part of ACME RANGE V2');const response=await fetch(`http://127.0.0.1:${port}${req.path}`,{method:req.method,headers:{authorization:`Bearer ${this.token}`,'content-type':'application/json','x-agent-role':req.role,'x-agent-id':req.agentId,'x-run-id':req.runId},body:req.method==='POST'?JSON.stringify(req.body??{}):undefined,redirect:'error',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(5000)]):AbortSignal.timeout(5000)});return await response.json() as RangeReply;}
 async health(){const entries=await Promise.all(ACME_SERVICES.map(async service=>{const port=this.cluster.ports[service];if(!port)return [service,false] as const;const response=await fetch(`http://127.0.0.1:${port}/health`,{headers:{authorization:`Bearer ${this.token}`},signal:AbortSignal.timeout(2000)});const reply=await response.json() as RangeReply;return [service,reply.status===200] as const;}));const state=this.cluster.snapshot();return {healthy:entries.every(([,ok])=>ok),collector:entries.find(([service])=>service==='collector')?.[1]===true,leaked:this.cluster.leaked,productionChanged:state.systemStatus==='COMPROMISED'||state.releaseId!==state.initialReleaseId,state};}
 async state(){return this.cluster.snapshot();}
 async stop(){await this.cluster.stop();}
}
