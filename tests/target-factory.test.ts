import { describe,expect,it } from 'vitest';
import { targetFromEnv } from '../lib/target/factory';

describe('target runtime selection',()=>{
 it('defaults to the guaranteed local runtime even when Tenki credentials exist',()=>{
  const selection=targetFromEnv({NODE_ENV:'test',TENKI_API_KEY:'tk_unused'});
  expect(selection.requested).toBe('local');expect(selection.runtime.kind).toBe('local');
 });
 it('selects Tenki only when explicitly requested',()=>{
  const selection=targetFromEnv({NODE_ENV:'test',TARGET_RUNTIME:'tenki',TENKI_API_KEY:'tk_test'});
  expect(selection.requested).toBe('tenki');expect(selection.runtime.kind).toBe('tenki');expect(selection.fallbackReason).toBeUndefined();
 });
 it('fails closed when Tenki is explicit and its credential is missing',async()=>{
  const selection=targetFromEnv({NODE_ENV:'test',TARGET_RUNTIME:'tenki'});
  await expect(selection.runtime.start()).rejects.toThrow('TENKI_API_KEY is required');
 });
});
