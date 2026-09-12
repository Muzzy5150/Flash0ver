import { z } from 'zod';
import type { AgentProvider, ChatMessage, ModelReply, ToolDefinition } from './types';
const ReplySchema=z.object({choices:z.array(z.object({message:z.object({content:z.string().nullable().optional(),tool_calls:z.array(z.object({id:z.string(),type:z.literal('function'),function:z.object({name:z.string(),arguments:z.string()})})).optional()})})).min(1),usage:z.object({prompt_tokens:z.number().optional(),completion_tokens:z.number().optional(),total_tokens:z.number().optional()}).optional()});
export class OpenAICompatibleProvider implements AgentProvider {
  constructor(readonly model:string,private apiKey:string,private baseUrl='https://api.openai.com/v1',private timeoutMs=45000,private maxOutputTokens=512,private reasoningEffort?:string) {
    const url=new URL(baseUrl); if(url.protocol!=='https:'&&!['localhost','127.0.0.1'].includes(url.hostname)) throw new Error('Remote model endpoints require HTTPS');
  }
  private async request(body:Record<string,unknown>,signal:AbortSignal) {
    if(!this.apiKey) throw new Error('LLM_API_KEY is not configured');
    for(let attempt=0;attempt<2;attempt++) {
      const r=await fetch(`${this.baseUrl.replace(/\/$/,'')}/chat/completions`,{method:'POST',headers:{authorization:`Bearer ${this.apiKey}`,'content-type':'application/json'},body:JSON.stringify({model:this.model,...body}),signal:AbortSignal.any([signal,AbortSignal.timeout(this.timeoutMs)]),redirect:'error'});
      if((r.status===429||r.status>=500)&&attempt===0) { await r.body?.cancel(); continue; }
      if(!r.ok) {
        const payload=await r.json().catch(()=>({})) as {error?:{code?:unknown;message?:unknown;type?:unknown}};
        const detail=sanitizeProviderError(payload.error);
        throw new Error(`Model provider returned HTTP ${r.status}${detail?`: ${detail}`:''}; check model, credentials, and quota`);
      }
      return {data:ReplySchema.parse(await r.json()),attempts:attempt+1};
    }
    throw new Error('Model provider unavailable');
  }
  async complete(messages:ChatMessage[],tools:ToolDefinition[],signal:AbortSignal):Promise<ModelReply> {
    const {data:r,attempts}=await this.request({messages,tools,tool_choice:'auto',parallel_tool_calls:false,max_completion_tokens:this.maxOutputTokens,...(this.reasoningEffort?{reasoning_effort:this.reasoningEffort}:{})},signal);
    const m=r.choices[0].message;
    return {content:m.content??null,calls:(m.tool_calls??[]).map(t=>({id:t.id,name:t.function.name,arguments:t.function.arguments})),usage:r.usage?{inputTokens:r.usage.prompt_tokens,outputTokens:r.usage.completion_tokens,totalTokens:r.usage.total_tokens}:undefined,attempts};
  }
  async check(signal:AbortSignal) { await this.request({messages:[{role:'user',content:'Reply READY.'}],max_completion_tokens:16},signal); }
}
export function providerFromEnv(env:NodeJS.ProcessEnv=process.env):AgentProvider {
  const provider=env.LLM_PROVIDER||'openai-compatible';
  if(provider!=='openai-compatible') throw new Error(`Unsupported LLM_PROVIDER: ${provider}`);
  return new OpenAICompatibleProvider(env.LLM_MODEL||'gpt-4.1-mini',env.LLM_API_KEY||'',env.LLM_BASE_URL||'https://api.openai.com/v1',boundedInt(env.LLM_TIMEOUT_MS,45000,1000,120000),boundedInt(env.LLM_MAX_OUTPUT_TOKENS,512,64,8000),env.LLM_REASONING_EFFORT);
}
function boundedInt(raw:string|undefined,fallback:number,min:number,max:number) { const n=Number(raw??fallback);return Number.isInteger(n)&&n>=min&&n<=max?n:fallback; }
function sanitizeProviderError(error:{code?:unknown;message?:unknown;type?:unknown}|undefined) {
  if(!error)return '';
  const code=[error.type,error.code].filter(v=>typeof v==='string').join('/');
  const message=typeof error.message==='string'?error.message.replace(/sk-[A-Za-z0-9_-]+/g,'[REDACTED]').slice(0,500):'';
  return [code,message].filter(Boolean).join(' — ');
}
