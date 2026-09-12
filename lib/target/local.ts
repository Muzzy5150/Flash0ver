import { randomBytes } from 'node:crypto';
import { RangeCluster } from '../../range/services/range';
import type { RangeRequest, RangeReply, TargetRuntime } from './types';
export function validatePath(path:string) { if(!/^\/[A-Za-z0-9/_-]*(\?[A-Za-z0-9_=&%-]*)?$/.test(path)||path.includes('..')||path.startsWith('//')||/%(?:2e|2f|5c)/i.test(path)) throw new Error('Only relative range paths are permitted'); }
export class LocalTargetRuntime implements TargetRuntime {
  kind='local' as const; identity='localhost';
  private token=randomBytes(32).toString('hex');
  private cluster=new RangeCluster(this.token);
  async start() { await this.cluster.start(); this.identity=`localhost · ${Object.keys(this.cluster.ports).length} HTTP services`; }
  async reset(runId:string) { this.cluster.reset(runId); }
  async request(req:RangeRequest,signal?:AbortSignal):Promise<RangeReply> {
    validatePath(req.path);
    const port=this.cluster.ports[req.service]; if(!port) throw new Error('Unknown service');
    const response=await fetch(`http://127.0.0.1:${port}${req.path}`,{method:req.method,headers:{authorization:`Bearer ${this.token}`,'content-type':'application/json','x-agent-role':req.role,'x-agent-id':req.agentId,'x-run-id':req.runId},body:req.method==='POST'?JSON.stringify(req.body??{}):undefined,redirect:'error',signal:signal?AbortSignal.any([signal,AbortSignal.timeout(5000)]):AbortSignal.timeout(5000)});
    return await response.json() as RangeReply;
  }
  async health() {
    const states=await Promise.all(Object.values(this.cluster.ports).map(async port=>{ const r=await fetch(`http://127.0.0.1:${port}/health`,{headers:{authorization:`Bearer ${this.token}`},signal:AbortSignal.timeout(2000)});return await r.json() as RangeReply;}));
    return {healthy:states.length===5&&states.every(r=>r.status===200),collector:states[4]?.status===200,leaked:this.cluster.leaked};
  }
  async stop() { await this.cluster.stop(); }
}
