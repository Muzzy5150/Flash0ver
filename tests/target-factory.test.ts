import { describe,expect,it } from 'vitest';
import { targetFromEnv } from '../lib/target/factory';

describe('target runtime selection',()=>{
 it('keeps localhost as the guaranteed fallback when Tenki is requested',()=>{
  const selection=targetFromEnv({NODE_ENV:'test',TARGET_RUNTIME:'tenki'});
  expect(selection.requested).toBe('tenki');
  expect(selection.runtime.kind).toBe('local');
  expect(selection.fallbackReason).toContain('disabled');
 });
});
