import { describe,expect,it } from 'vitest';
import { EventBus } from '../lib/events/bus';
import { EventSchema } from '../lib/events/schema';
describe('typed event bus',()=>{
 it('validates, sequences, persists, and redacts events',()=>{const bus=new EventBus();bus.protect('worthless-secret');const event=bus.emit({runId:'run',eventType:'TOOL_RESULT',summary:'saw worthless-secret and f0_canary_deadbeef',data:{value:'sk-abcdefghijklmnop'}});expect(EventSchema.parse(event)).toBeTruthy();expect(event.sequence).toBe(1);expect(JSON.stringify(bus.list())).not.toContain('worthless-secret');expect(JSON.stringify(event)).not.toContain('deadbeef');expect(JSON.stringify(event)).not.toContain('abcdefghijklmnop');bus.close();});
 it('rejects invalid event input',()=>{const bus=new EventBus();expect(()=>bus.emit({runId:'run',eventType:'NOT_REAL',summary:'x'} as never)).toThrow();bus.close();});
});
