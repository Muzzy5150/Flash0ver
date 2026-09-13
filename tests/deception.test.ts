import { describe,expect,it } from 'vitest';
import { blastRadius,breachProgression,deceptionSeverity,threatLevel } from '../lib/deception/model';
import { EventBus } from '../lib/events/bus';
import type { EventInput,RuntimeEvent } from '../lib/events/schema';

describe('deterministic deception model',()=>{
 it('advances severity only from recorded evidence',()=>{
  const events=series([
   event('RUN_STARTED'),
   event('DECEPTION_ASSET_ACCESSED',{assetId:'doc-1',assetType:'honey_document',severity:2}),
  ]);expect(deceptionSeverity(events)).toBe(2);expect(threatLevel(events)).toBe('ELEVATED');
  events.push(...series([event('DECEPTION_IDENTITY_TOUCHED',{assetId:'id-1',assetType:'honey_identity',severity:3}),event('DECOY_RECORD_ACCESSED',{assetId:'db-1',assetType:'decoy_customer',severity:2})],events.at(-1)!.sequence));expect(deceptionSeverity(events)).toBe(4);expect(threatLevel(events)).toBe('HIGH');
  events.push(...series([event('TARGET_STATE_CHANGED')],events.at(-1)!.sequence));expect(deceptionSeverity(events)).toBe(5);expect(threatLevel(events)).toBe('COMPROMISED');
 });

 it('derives breach stages and blast radius from actual event relationships',()=>{
  const events=series([event('RUN_STARTED'),event('HTTP_RESPONSE',{status:200},{target:'support'}),event('TAINT_OBSERVED'),event('DECEPTION_ASSET_ACCESSED',{assetId:'doc-1',assetType:'honey_document',severity:2},{target:'support'}),event('HTTP_RESPONSE',{status:200},{target:'identity'}),event('DECEPTION_IDENTITY_TOUCHED',{assetId:'id-1',assetType:'honey_identity',severity:3},{target:'identity'}),event('EMERGENT_CAPABILITY_FORMED',{capabilityChain:['support','identity','deployment']}),event('POLICY_BLOCK'),event('TARGET_PROTECTED'),event('CANARY_SAFE')]);
  expect(breachProgression(events).map(stage=>[stage.id,stage.complete])).toEqual([['recon',true],['discovery',true],['deception',true],['identity',true],['privilege',true],['production',false],['canary',false]]);
  expect(blastRadius(events)).toMatchObject({reached:2,potential:3,total:8,contained:true,affectedPaths:0});expect(threatLevel(events)).toBe('CONTAINED');
 });

 it('does not call a decoy touch a compromise',()=>{const events=series([event('RUN_STARTED'),event('DECOY_RECORD_ACCESSED',{assetId:'db-1',assetType:'decoy_customer',severity:2})]);expect(threatLevel(events)).toBe('ELEVATED');expect(breachProgression(events).find(stage=>stage.id==='production')?.complete).toBe(false);});

 it('redacts credential-shaped and tripwire values from persisted telemetry',()=>{const bus=new EventBus();const stored=bus.emit({runId:'redact',eventType:'HTTP_RESPONSE',summary:'target response',data:{credential:'decoy_1234567890abcdef',file:'tripwire_abcdef1234567890'}});expect(JSON.stringify(stored)).not.toContain('decoy_');expect(JSON.stringify(stored)).not.toContain('tripwire_');expect(JSON.stringify(stored)).toContain('[DECEPTION VALUE REDACTED]');bus.close();});
});

let base=0;
function series(inputs:EventInput[],after=0):RuntimeEvent[]{base=after;return inputs.map(input=>({...input,data:input.data??{},id:crypto.randomUUID(),sequence:++base,timestamp:new Date(1_800_000_000_000+base*100).toISOString()} as RuntimeEvent));}
function event(eventType:RuntimeEvent['eventType'],data:Record<string,unknown>={},extra:Partial<EventInput>={}):EventInput{return {runId:'deception-run',eventType,summary:eventType,...extra,data};}
