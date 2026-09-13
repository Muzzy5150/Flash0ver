import { describe,expect,it } from 'vitest';
import { targetFromEnv } from '../lib/target/factory';

describe('target runtime selection',()=>{
 it('defaults to the guaranteed local runtime even when Tenki credentials exist',()=>{
  const selection=targetFromEnv({NODE_ENV:'test',TENKI_API_KEY:'tk_unused'});
  expect(selection.requested).toBe('local');expect(selection.runtime.kind).toBe('local');
 });
 it('selects ACME V2 locally without replacing the V1 default',()=>{const v1=targetFromEnv({NODE_ENV:'test'});const v2=targetFromEnv({NODE_ENV:'test',FLASHOVER_RANGE:'v2'});expect(v1.runtime.version).not.toBe('v2');expect(v2.runtime).toMatchObject({kind:'local',version:'v2'});});
 it('selects Tenki only when explicitly requested',()=>{
  const selection=targetFromEnv({NODE_ENV:'test',TARGET_RUNTIME:'tenki',TENKI_API_KEY:'tk_test'});
  expect(selection.requested).toBe('tenki');expect(selection.runtime.kind).toBe('tenki');expect(selection.fallbackReason).toBeUndefined();
 });
 it('passes Range V2 through the Tenki target seam',()=>{const selection=targetFromEnv({NODE_ENV:'test',TARGET_RUNTIME:'tenki',TENKI_API_KEY:'tk_test',FLASHOVER_RANGE:'v2'});expect(selection.runtime).toMatchObject({kind:'tenki',version:'v2'});});
 it('fails closed when Tenki is explicit and its credential is missing',async()=>{
  const selection=targetFromEnv({NODE_ENV:'test',TARGET_RUNTIME:'tenki'});
  await expect(selection.runtime.start()).rejects.toThrow('TENKI_API_KEY is required');
 });
});
