import { DatabaseSync } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { EventEmitter } from 'node:events';
import { EventSchema, type EventInput, type RuntimeEvent } from './schema';
export class EventBus {
  readonly db:DatabaseSync;
  private emitter = new EventEmitter();
  private sequence:number;
  private secrets = new Set<string>();
  private persistence={count:0,totalMs:0,maxMs:0};
  private persistenceSamples:number[]=[];
  constructor(path = ':memory:') {
    this.db = new DatabaseSync(path);
    this.db.exec('PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS events (sequence INTEGER PRIMARY KEY, run_id TEXT NOT NULL, payload TEXT NOT NULL); CREATE INDEX IF NOT EXISTS events_run ON events(run_id,sequence)');
    this.sequence = Number((this.db.prepare('SELECT COALESCE(MAX(sequence),0) AS n FROM events').get() as {n:number}).n);
    this.emitter.setMaxListeners(50);
  }
  protect(value:string) { if(value) this.secrets.add(value); }
  redact(value:string) { for(const secret of this.secrets) value=value.split(secret).join('[REDACTED]'); return value.replace(/f0_canary_[a-f0-9]+/g,'[CANARY REDACTED]').replace(/sk-[A-Za-z0-9_-]{12,}/g,'[API KEY REDACTED]'); }
  emit(input:EventInput):RuntimeEvent {
    const started=performance.now();
    const event=EventSchema.parse(JSON.parse(this.redact(JSON.stringify({...input,data:input.data??{},id:randomUUID(),sequence:++this.sequence,timestamp:new Date().toISOString()}))));
    this.db.prepare('INSERT INTO events(sequence,run_id,payload) VALUES(?,?,?)').run(event.sequence,event.runId,JSON.stringify(event));
    const durationMs=performance.now()-started;this.persistence.count++;this.persistence.totalMs+=durationMs;this.persistence.maxMs=Math.max(this.persistence.maxMs,durationMs);this.persistenceSamples.push(durationMs);
    this.emitter.emit('event',event); return event;
  }
  list(runId?:string, after=0):RuntimeEvent[] {
    const rows=runId ? this.db.prepare('SELECT payload FROM events WHERE run_id=? AND sequence>? ORDER BY sequence').all(runId,after) : this.db.prepare('SELECT payload FROM events WHERE sequence>? ORDER BY sequence').all(after);
    return rows.map(row=>JSON.parse(row.payload as string));
  }
  subscribe(fn:(event:RuntimeEvent)=>void) { this.emitter.on('event',fn); return ()=>{this.emitter.off('event',fn);}; }
  healthy() { return this.db.prepare('SELECT 1 AS ok').get()?.ok===1; }
  timing() { return {...this.persistence}; }
  timingSince(snapshot:ReturnType<EventBus['timing']>){const samples=this.persistenceSamples.slice(snapshot.count);return {count:samples.length,totalMs:samples.reduce((sum,value)=>sum+value,0),maxMs:samples.length?Math.max(...samples):0};}
  close() { this.emitter.removeAllListeners(); this.db.close(); }
}
