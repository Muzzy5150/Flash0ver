import { describe,expect,it } from 'vitest';
import { narrateEvents } from '../lib/events/narration';
import type { RuntimeEvent } from '../lib/events/schema';

const event=(eventType:RuntimeEvent['eventType'],summary:string,data:Record<string,unknown>={}):RuntimeEvent=>({id:crypto.randomUUID(),sequence:1,runId:'run-1',timestamp:'2026-09-13T12:00:00.000Z',agentId:'operator-01',eventType,summary,data});
describe('incident tape narration',()=>{
 it('formats only source-backed telemetry and preserves source IDs and timestamps',()=>{const source=[event('AGENT_MESSAGE','handoff',{to:'analyst-01'}),event('EMERGENT_CAPABILITY_FORMED','formed'),event('POLICY_BLOCK','composition denied')];source[0].target='analyst-01';const lines=narrateEvents(source);expect(lines).toHaveLength(3);expect(lines.map(line=>line.sourceEventId)).toEqual(source.map(item=>item.id));expect(lines.every(line=>line.timestamp==='2026-09-13T12:00:00.000Z')).toBe(true);expect(lines[2]).toMatchObject({category:'block',text:'DENY · composition denied'});});
 it('narrates deception signals and escalation from their source events',()=>{const source=[event('DECEPTION_CREDENTIAL_USED','decoy credential rejected',{assetId:'credential-honey-1',sourceService:'deployment'}),event('DECEPTION_ESCALATED','Deception severity increased to 3',{previousLevel:2,severityLevel:3})];const lines=narrateEvents(source);expect(lines).toHaveLength(2);expect(lines[0]).toMatchObject({category:'block',actor:'operator-01',text:'CREDENTIAL TRIPWIRE · decoy credential rejected'});expect(lines[1]).toMatchObject({category:'warning',actor:'THREAT',text:'THREAT LEVEL 2 → 3'});expect(lines.map(line=>line.sourceEventId)).toEqual(source.map(item=>item.id));});
 it('does not fabricate narration for an unselected low-level event',()=>{expect(narrateEvents([event('HTTP_RESPONSE','response')])).toEqual([]);});
});
