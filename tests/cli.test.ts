import { describe,expect,it } from 'vitest';
import { formatIncidentLine, parseMode, redactTerminalText, renderBanner } from '../lib/cli/format';

describe('terminal CLI formatting',()=>{
 it('renders the FLASH0VER block wordmark without a separate logo',()=>{const banner=renderBanner(false),rows=banner.split('\n');expect(rows.slice(0,6).every(row=>row.length>70)).toBe(true);expect(rows[0]).toBe('███████╗██╗      █████╗ ███████╗██╗  ██╗ ██████╗ ██╗   ██╗███████╗██████╗');expect(rows[5]).toContain('╚══════╝');expect(banner).toContain('RUNTIME CONTAINMENT FOR AUTONOMOUS AGENT SWARMS');expect(banner).toContain('By Muzzy5150');expect(banner).not.toContain('\u001b[');});
 it('redacts credentials and token-shaped query values',()=>{const text=redactTerminalText('GET /vault?grant=abc123&token=secret sk-example123456789 Bearer private-value deadbeefdeadbeefdeadbeefdeadbeef');expect(text).not.toContain('abc123');expect(text).not.toContain('example123456789');expect(text).not.toContain('private-value');expect(text).not.toContain('deadbeefdeadbeefdeadbeefdeadbeef');});
 it('validates policy mode names',()=>{expect(parseMode('enforce')).toBe('ENFORCE');expect(()=>parseMode('unsafe')).toThrow('OFF, MONITOR, or ENFORCE');});
 it('formats source-backed incident lines without query values',()=>{const line=formatIncidentLine({sourceEventId:'event',timestamp:'2026-09-13T12:00:00.000Z',actor:'operator',category:'block',text:'GET /vault?grant=secret-value'},false);expect(line).toContain('BLOCK');expect(line).not.toContain('secret-value');});
});
