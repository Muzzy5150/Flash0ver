import { writeFileSync } from 'node:fs';
import { EventBus } from '../lib/events/bus';
import type { RuntimeEvent } from '../lib/events/schema';

const path=process.argv[2]||'data/flash0ver.sqlite';
const bus=new EventBus(path);
const events=bus.list();
const runIds=[...new Set(events.filter(event=>event.eventType==='RUN_STARTED').map(event=>event.runId))];
const reports=runIds.map(runId=>analyze(events.filter(event=>event.runId===runId))).filter(report=>report.mode==='OFF'||report.mode==='ENFORCE');
bus.close();
writeFileSync('data/latency-report.json',`${JSON.stringify(reports,null,2)}\n`);

for(const report of reports.slice(-6)){
 console.log(`LATENCY ${report.mode} ${report.runId} ${format(report.wallMs)} · ${report.model.count} model calls ${format(report.model.totalMs)} (p50 ${format(report.model.p50Ms)}, p95 ${format(report.model.p95Ms)}) · coordinator wait ${format(report.coordinatorWaitMs)} · worker wall ${JSON.stringify(report.workerMs)} · exclusive tools ${format(report.tools.exclusiveMs)} · Wasmer ${format(report.wasmer.totalMs)} · HTTP ${format(report.http.totalMs)} · DB/events ${format(report.database.totalMs)} · output ${report.model.outputTokens} tokens`);
}
console.log(`Wrote ${reports.length} run reports with per-call timings to data/latency-report.json`);

function analyze(items:RuntimeEvent[]){
 const start=items.find(event=>event.eventType==='RUN_STARTED')!;
 const end=items.findLast(event=>['RUN_FINISHED','RUN_FAILED','RUN_STOPPED'].includes(event.eventType));
 const roles=new Map(items.filter(event=>event.eventType==='AGENT_CREATED'&&event.agentId).map(event=>[event.agentId!,String(event.data.role)]));
 const model=pair(items,'MODEL_REQUEST','MODEL_RESPONSE').map((pair,index)=>({index:index+1,agentId:pair.start.agentId,role:roles.get(pair.start.agentId||'')||'unknown',turn:Number(pair.start.data.turn||pair.start.summary.match(/\d+/)?.[0]||0),durationMs:duration(pair),inputTokens:Number((pair.end.data.usage as Record<string,unknown>|undefined)?.inputTokens||0),outputTokens:Number((pair.end.data.usage as Record<string,unknown>|undefined)?.outputTokens||0)}));
 const tools=pair(items,'TOOL_REQUEST','TOOL_RESULT',event=>`${event.agentId}:${String(event.data.tool||event.target)}`).map(item=>({agentId:item.start.agentId,name:String(item.start.data.tool||item.start.target),durationMs:duration(item)}));
 const wasmer=pair(items,'WASMER_PROCESS_STARTED','WASMER_PROCESS_EXITED',event=>event.agentId||'').map(duration);
 const http=pair(items,'HTTP_REQUEST','HTTP_RESPONSE',event=>event.agentId||'').map(duration);
 const agents=pair(items,'AGENT_STARTED','AGENT_FINISHED',event=>event.agentId||'');
 const workerMs=Object.fromEntries(agents.filter(item=>roles.get(item.start.agentId||'')!=='coordinator').map(item=>[`${roles.get(item.start.agentId||'')}:${item.start.agentId}`,elapsed(item)]));
 const delegate=tools.filter(tool=>tool.name==='delegate_worker');
 const modelDurations=model.map(call=>call.durationMs);
 const timing=items.findLast(event=>event.eventType==='RUN_TIMING')?.data;const database=(timing?.events as Record<string,unknown>|undefined)||{};
 return {runId:start.runId,mode:String(start.data.mode),wallMs:end?new Date(end.timestamp).getTime()-new Date(start.timestamp).getTime():0,execution:'sequential',model:{count:model.length,totalMs:sum(modelDurations),p50Ms:percentile(modelDurations,.5),p95Ms:percentile(modelDurations,.95),inputTokens:sum(model.map(call=>call.inputTokens)),outputTokens:sum(model.map(call=>call.outputTokens)),byRole:Object.fromEntries([...new Set(model.map(call=>call.role))].map(role=>[role,model.filter(call=>call.role===role).length])),calls:model},coordinatorWaitMs:sum(delegate.map(tool=>tool.durationMs)),workerMs,tools:{count:tools.length,totalMs:sum(tools.map(tool=>tool.durationMs)),exclusiveMs:sum(tools.filter(tool=>tool.name!=='delegate_worker').map(tool=>tool.durationMs)),calls:tools},wasmer:{count:wasmer.length,totalMs:sum(wasmer)},http:{count:http.length,totalMs:sum(http)},database:{writes:Number(database.writes||0),totalMs:Number(database.totalMs||0),maxMs:Number(database.maxMs||0)}};
}

function pair(items:RuntimeEvent[],startType:string,endType:string,key:(event:RuntimeEvent)=>string=event=>event.agentId||'run'){
 const pending=new Map<string,RuntimeEvent[]>();const result:{start:RuntimeEvent;end:RuntimeEvent}[]=[];
 for(const event of items){const id=key(event);if(event.eventType===startType)pending.set(id,[...(pending.get(id)||[]),event]);if(event.eventType===endType){const starts=pending.get(id);const start=starts?.shift();if(start)result.push({start,end:event});}}
 return result;
}
function elapsed(pair:{start:RuntimeEvent;end:RuntimeEvent}){return Math.max(0,new Date(pair.end.timestamp).getTime()-new Date(pair.start.timestamp).getTime());}
function duration(pair:{start:RuntimeEvent;end:RuntimeEvent}){const measured=Number(pair.end.data.durationMs);return Number.isFinite(measured)&&measured>=0?measured:elapsed(pair);}
function sum(values:number[]){return values.reduce((total,value)=>total+value,0);}
function percentile(values:number[],ratio:number){if(!values.length)return 0;const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.min(sorted.length-1,Math.ceil(sorted.length*ratio)-1)];}
function format(ms:number){return `${(ms/1000).toFixed(2)}s`;}
