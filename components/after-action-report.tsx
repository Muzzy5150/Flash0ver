'use client';

import { useMemo,useState } from 'react';
import type { RuntimeEvent } from '../lib/events/schema';
import { reconstructIncident,type AgentSummary,type ImportantHandoff,type IncidentReport,type KeyMoment,type PolicyDecision,type TargetEffect,type TargetSnapshot,type TeamContribution,type TeamSummary } from '../lib/incidents/report';

type Tab='SUMMARY'|'TIMELINE'|'AGENTS'|'COMMUNICATIONS'|'EVIDENCE / POLICY';
const TABS:Tab[]=['SUMMARY','TIMELINE','AGENTS','COMMUNICATIONS','EVIDENCE / POLICY'];
const FILTERS=['ALL','AGENTS','MESSAGES','TOOLS','HTTP','DECEPTION','POLICY','TARGET','SENTINEL'] as const;
type Filter=typeof FILTERS[number];

export function AfterActionReport({event,events,recent,onSelectRun}:{event?:RuntimeEvent;events:RuntimeEvent[];recent:RuntimeEvent[];onSelectRun:(runId:string)=>void}){
 const [tab,setTab]=useState<Tab>('SUMMARY');
 const report=useMemo(()=>{if(!event)return undefined;try{return reconstructIncident(events);}catch{return event.data.report as IncidentReport|undefined;}},[event,events]);
 if(!event||!report)return <section className="afterAction emptyReport"><h2>AFTER ACTION REPORT</h2><p>A source-backed report appears after a real run concludes.</p></section>;
 const outcome=report.outcome??(report.canaryResult==='COMPROMISED'?'compromised':report.canaryResult==='SAFE'?'contained':'incomplete');
 return <section className={`afterAction ${outcome}`}>
  <header className="aarHeader"><div><span>AFTER ACTION REPORT · PERSISTED TELEMETRY</span><h1>{outcome==='compromised'?'ACME PRODUCTION COMPROMISED':outcome==='contained'?'PROPAGATION CONTAINED':'OUTCOME UNCONFIRMED'}</h1><p>{report.targetResult??`CANARY ${report.canaryResult}`}</p></div><label>RECENT RUN<select value={event.runId} onChange={change=>onSelectRun(change.target.value)}>{recent.map(item=><option key={item.id} value={item.runId}>{modeOf(item)} · {shortId(item.runId)} · {timeOf(item.timestamp)}</option>)}</select></label></header>
  <nav className="aarTabs" aria-label="After action report sections">{TABS.map(item=><button className={tab===item?'active':''} key={item} onClick={()=>setTab(item)}>{item}</button>)}</nav>
  <div className="aarBody">
   {tab==='SUMMARY'&&<Summary report={report} events={events} onInvestigate={setTab}/>} 
   {tab==='TIMELINE'&&<Timeline events={events}/>} 
   {tab==='AGENTS'&&<Agents report={report}/>} 
   {tab==='COMMUNICATIONS'&&<Communications report={report}/>} 
   {tab==='EVIDENCE / POLICY'&&<EvidencePolicy report={report}/>} 
  </div>
 </section>;
}

function Summary({report,events,onInvestigate}:{report:IncidentReport;events:RuntimeEvent[];onInvestigate:(tab:Tab)=>void}){
 const summary=report.humanSummary??fallbackSummary(report),executive=report.executiveSummary?.length?report.executiveSummary:[summary.whatHappened,summary.whyItMattered,summary.result];
 const teams=report.contributingTeams?.length?report.contributingTeams:array<TeamSummary>(report.teamSummaries).filter(team=>!['COMMAND','SENTINEL','OTHER'].includes(team.team)&&team.findings>0).map(team=>team.team);
 const contributions=report.teamContributions?.length?report.teamContributions:fallbackContributions(report,teams);
 const metrics=[['MODE',report.mode],['RESULT',report.outcome.toUpperCase()],['AGENTS',String(report.agents?.length??0)],['TEAMS',String(teams.length)],['DURATION',duration(report.durationMs)],['MESSAGES',String(report.messages??count(events,'AGENT_MESSAGE'))],['TOOLS',String(report.toolCalls??count(events,'TOOL_REQUEST'))],['POLICY BLOCKS',String(report.policyBlocks??count(events,'POLICY_BLOCK'))]];
 const moments=array<KeyMoment>(report.keyMoments).slice(0,8),routes=communicationLanes(events),handoff=commandHandoff(report,events),important=importantAgents(report).slice(0,5);
 return <div className="summaryTab claritySummary">
  <article className="reportCard executiveBrief"><Title kicker="DETERMINISTIC · SOURCE-BACKED · SANITIZED">EXECUTIVE SUMMARY</Title><div>{executive.slice(0,5).map((sentence,index)=><p key={index}>{sentence}</p>)}</div></article>

  <section className={`finalResult ${report.outcome}`} aria-label="Final result"><div><span>FINAL RESULT</span><strong>{report.outcome==='compromised'?'CANARY COMPROMISED':report.outcome==='contained'?'PROPAGATION CONTAINED':'OUTCOME UNCONFIRMED'}</strong><p>{summary.result}</p></div><div className="resultFacts"><ResultFact label="TARGET" value={report.targetAfter?.systemStatus??'UNKNOWN'}/><ResultFact label="CANARY" value={report.canaryResult}/><ResultFact label="OPERATIONAL" value={String(report.agentsStillOperational??'—')}/><ResultFact label="QUARANTINED" value={String(report.agentsQuarantined?.length??0)}/></div></section>

  <article className="reportCard whatHappened"><Title kicker={`RUN ${shortId(report.runId)} · ${dateTime(report.startedAt)}`}>WHAT HAPPENED</Title><div className="snapshotMetrics">{metrics.map(([label,value])=><div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div><div className="targetTransitions"><Transition label="PRODUCTION" before={report.targetBefore?.systemStatus} after={report.targetAfter?.systemStatus}/><Transition label="DEPLOYMENT" before={report.targetBefore?.deploymentAuthority} after={deploymentAfter(report)}/><Transition label="CANARY" before={report.targetBefore?.canaryState} after={canaryAfter(report)}/></div></article>

  <article className="reportCard whyHappened"><Title kicker="CAPABILITY COMPOSITION EXPLAINED">WHY IT HAPPENED</Title><p className="whyLead">{summary.whyItMattered}</p><div className="contributionList">{contributions.map(item=><Contribution key={item.team} item={item}/>)}</div><div className="emergentResult"><span>COMBINED RESULT</span><strong>{report.capabilityChain?.length?report.capabilityChain.join(' → '):report.outcome==='contained'?'SENSITIVE CAPABILITY DENIED':'EMERGENT SENSITIVE CAPABILITY'}</strong><p>{report.outcome==='contained'?`FLASH0VER detected the composed action, denied ${report.policyBlocks} policy-violating request${report.policyBlocks===1?'':'s'}, and preserved a healthy target with a clean collector.`:`The target and collector outcome confirms what the combined capability achieved in the authorized range.`}</p></div></article>

  <article className="reportCard keyMoments"><Title kicker={`${moments.length} DECISIVE EVENTS · EACH LINKS TO PERSISTED TELEMETRY`}>KEY MOMENTS</Title><div className="momentList">{moments.map(moment=><div key={moment.sourceEventId}><time>+{relativeTime(report.startedAt,moment.timestamp)}</time><span className="momentDot"/><div><b>{moment.eventType.replaceAll('_',' ')}</b><p>{moment.summary}</p><code>{moment.team} · {moment.agentId?shortId(moment.agentId):'SYSTEM'} · {shortId(moment.sourceEventId)}</code></div></div>)}{!moments.length&&<p>No decisive moments were recorded for this run.</p>}</div></article>

  <div className="reportGrid summaryProofGrid">
   <article className="reportCard swarmCommunication"><Title kicker={`${report.communicationSummary?.totalMessages??report.messages??0} REAL AGENT_MESSAGE EVENTS`}>HOW THE SWARM COMMUNICATED</Title><div className="laneList">{routes.map(route=><div key={`${route.from}-${route.to}`}><b>{route.from}</b><i>→</i><strong>{route.to}</strong><span>{route.count}</span></div>)}</div>{handoff&&<div className="keyHandoff"><span>KEY HANDOFF</span><strong>{handoff.text}</strong><code>EVENT {shortId(handoff.eventId)}</code></div>}</article>
   <article className="reportCard importantAgents"><Title kicker="HIGHEST SOURCE-BACKED CONTRIBUTION">MOST IMPORTANT AGENTS</Title><div>{important.map(agent=><div key={agent.agentId}><span>{agent.team}</span><b>{agent.role}</b><code>{shortId(agent.agentId)}</code><p>{agent.contribution[0]??`${agent.toolsRequested} tools · ${agent.messagesSent+agent.messagesReceived} messages`}</p></div>)}</div></article>
  </div>

  <article className="reportCard investigateDeeper"><Title kicker="COMPLETE TECHNICAL PROOF REMAINS AVAILABLE">INVESTIGATE DEEPER</Title><div><button onClick={()=>onInvestigate('TIMELINE')}><b>RAW TIMELINE</b><span>Every persisted event and sanitized detail</span></button><button onClick={()=>onInvestigate('AGENTS')}><b>ALL AGENTS</b><span>Identity, activity, contribution, and security</span></button><button onClick={()=>onInvestigate('COMMUNICATIONS')}><b>COMMUNICATIONS</b><span>Agent routes, team routes, and handoffs</span></button><button onClick={()=>onInvestigate('EVIDENCE / POLICY')}><b>EVIDENCE / POLICY</b><span>Provenance, decisions, target effects, Sentinel</span></button></div></article>
 </div>;
}

function Timeline({events}:{events:RuntimeEvent[]}){
 const [filter,setFilter]=useState<Filter>('ALL');
 const visible=useMemo(()=>events.filter(event=>filter==='ALL'||category(event)===filter),[events,filter]);
 return <div className="timelineTab"><div className="timelineFilters">{FILTERS.map(item=><button key={item} className={filter===item?'active':''} onClick={()=>setFilter(item)}>{item}<b>{item==='ALL'?events.length:events.filter(event=>category(event)===item).length}</b></button>)}</div><div className="rawEventLog">{visible.map(event=><details key={event.id}><summary><time>{timeOf(event.timestamp)}</time><b>{event.eventType}</b><span>{String(sanitize(event.summary))}</span><code>{event.agentId?shortId(event.agentId):'SYSTEM'}</code></summary><pre>{JSON.stringify(safeDetails(event),null,2)}</pre></details>)}</div></div>;
}

function Agents({report}:{report:IncidentReport}){
 const teams=array<TeamSummary>(report.teamSummaries),agents=array<AgentSummary>(report.agentSummaries);
  return <div className="agentsTab"><div className="teamSummaryGrid">{teams.map(team=><TeamCard key={team.team} team={team}/>)}</div><article className="reportCard"><Title kicker={`${agents.length} TELEMETRY-DERIVED IDENTITIES`}>ALL AGENTS</Title><div className="agentReportList">{agents.map(agent=><details key={agent.agentId}><summary><b>{agent.team}</b><strong>{agent.role}</strong><code>{shortId(agent.agentId)}</code><span>{agent.finalState}</span><i>{agent.toolsRequested} tools · {agent.messagesSent}/{agent.messagesReceived} msg</i></summary><div className="agentProof"><section><h3>ROLE / TEAM / STATE</h3><Datum label="IDENTITY" value={agent.agentId}/><Datum label="ROLE / TEAM" value={`${agent.role} · ${agent.team}`}/><Datum label="STATE" value={agent.finalState}/><Datum label="PARENT" value={agent.parent??'ROOT'}/><Datum label="MODEL" value={agent.model||'Unrecorded'}/></section><section><h3>ACTIVITY</h3><Datum label="MODEL TURNS" value={String(agent.modelTurns)}/><Datum label="TOOLS" value={`${agent.toolsRequested} requested · ${agent.toolsAllowed} allowed · ${agent.toolsDenied} denied`}/><Datum label="MESSAGES" value={`${agent.messagesSent} sent · ${agent.messagesReceived} received`}/><Datum label="SERVICES" value={agent.servicesTouched.join(', ')||'None recorded'}/></section><section><h3>CONTRIBUTION</h3><Datum label="EVIDENCE" value={agent.artifactSources?.join(', ')||'None recorded'}/><Datum label="ARTIFACTS" value={agent.artifactsDiscovered.join(', ')||'None recorded'}/><Datum label="RESULT" value={agent.contribution.join(' · ')||'No material contribution recorded'}/></section><section><h3>SECURITY</h3><Datum label="POLICY EVENTS" value={String(agent.policyEvents)}/><Datum label="CONTAINMENT" value={agent.containmentActions.join(', ')||'None recorded'}/><Datum label="RECEIVED PROVENANCE" value={`${agent.artifactsReceived.length} artifact references`}/></section></div></details>)}{!agents.length&&<p>This earlier report does not contain per-agent summaries.</p>}</div></article></div>;
}

function Communications({report}:{report:IncidentReport}){
 const communications=report.communicationSummary??{totalMessages:report.messages??0,routes:[],teamRoutes:[]},handoffs=array<ImportantHandoff>(report.importantHandoffs);
 return <div className="communicationsTab"><div className="reportGrid two"><article className="reportCard"><Title kicker={`${communications.totalMessages} REAL AGENT_MESSAGE EVENTS`}>TEAM ROUTES</Title><div className="routeList">{communications.teamRoutes.map(route=><div key={`${route.from}-${route.to}`}><b>{route.from}</b><i>→</i><strong>{route.to}</strong><span>{route.count}</span></div>)}</div></article><article className="reportCard"><Title kicker={`${communications.routes.length} DISTINCT AGENT ROUTES`}>TOP AGENT ROUTES</Title><div className="routeList">{communications.routes.slice(0,12).map(route=><div key={`${route.from}-${route.to}`}><b>{shortId(route.from)}</b><i>→</i><strong>{shortId(route.to)}</strong><span>{route.count}</span></div>)}</div></article></div><article className="reportCard"><Title kicker="SELECTED FROM REAL CROSS-AGENT MESSAGE EVENTS">IMPORTANT HANDOFFS</Title><div className="handoffList">{handoffs.map(handoff=><div key={handoff.sourceEventId}><time>{timeOf(handoff.timestamp)}</time><b>{handoff.fromRole.toUpperCase()} → {handoff.toRole.toUpperCase()}</b><span>{handoff.purpose}</span><code>{handoff.evidenceIds.length} evidence refs · depth {handoff.provenanceDepth} · {shortId(handoff.sourceEventId)}</code></div>)}{!handoffs.length&&<p>No cross-agent handoffs were recorded in this report.</p>}</div></article></div>;
}

function EvidencePolicy({report}:{report:IncidentReport}){
 const decisions=array<PolicyDecision>(report.policyDecisions),effects=array<TargetEffect>(report.targetEffects),sentinel=array<IncidentReport['sentinelProposals'][number]>(report.sentinelProposals),deception=array<IncidentReport['deceptionEvents'][number]>(report.deceptionEvents);
 return <div className="evidencePolicyTab"><div className="reportGrid two"><article className="reportCard"><Title kicker={`${deception.length} RANGE TRIPWIRE EVENTS`}>DECEPTION / EVIDENCE</Title><div className="evidenceList">{deception.map((item,index)=><div key={`${item.assetId}-${index}`}><b>{item.eventType.replaceAll('_',' ')}</b><span>{item.assetType} · {item.sourceService} · severity {item.severity}</span><code>{item.agentId??'SYSTEM'} · {timeOf(item.timestamp)}</code></div>)}{!deception.length&&<p>No deception event was recorded.</p>}</div></article><article className="reportCard"><Title kicker={`${decisions.length} EXPLAINABLE DECISIONS`}>POLICY</Title><div className="policyDecisionList">{decisions.map(item=><div key={item.sourceEventId} className={item.result.includes('DENIED')?'denied':'warning'}><b>{item.result}</b><strong>{item.action}</strong><span>{item.rule}</span><code>{item.requestingAgent} · {item.provenancePath.length} provenance hops</code></div>)}{!decisions.length&&<p>No policy warning or block was recorded.</p>}</div></article></div><div className="reportGrid two"><article className="reportCard"><Title kicker="OBSERVED EFFECTS ONLY">TARGET EFFECTS</Title><div className="effectList">{effects.map(item=><div key={item.sourceEventId}><time>{timeOf(item.timestamp)}</time><b>{item.eventType.replaceAll('_',' ')}</b><span>{item.summary}</span></div>)}</div></article><article className="reportCard"><Title kicker="MODEL PROPOSAL · DETERMINISTIC VALIDATION">SENTINEL / CONTAINMENT</Title><div className="effectList">{sentinel.map(item=><div key={item.sourceEventId}><time>{timeOf(item.timestamp)}</time><b>SENTINEL {item.decision}</b><span>{item.action?`${item.action}${item.affectedAgent?` · ${item.affectedAgent}`:''}`:item.summary}</span></div>)}{array<string>(report.containmentActions).map((action,index)=><div key={`${action}-${index}`}><b>CONTAINMENT APPLIED</b><span>{action}</span></div>)}{!sentinel.length&&!report.containmentActions?.length&&<p>No Sentinel or containment action was recorded.</p>}</div></article></div></div>;
}

function ResultFact({label,value}:{label:string;value:string}){return <div><span>{label}</span><strong>{value}</strong></div>}
function Transition({label,before,after}:{label:string;before?:string;after?:string}){return <div><span>{label}</span><b>{before??'UNKNOWN'}</b><i>→</i><strong>{after??'UNKNOWN'}</strong></div>}
function Contribution({item}:{item:TeamContribution}){const sources=item.evidenceSources.slice(0,3);return <div><b>{item.team}</b><p>{item.summary}</p>{sources.length>0&&<code>{sources.join(' · ')}{item.evidenceSources.length>sources.length?` · +${item.evidenceSources.length-sources.length} sources`:''}</code>}</div>}

function deploymentAfter(report:IncidentReport){if(report.outcome==='contained'&&report.policyBlocks>0)return'BLOCKED';return report.targetAfter?.deploymentAuthority??'UNKNOWN'}
function canaryAfter(report:IncidentReport){if(report.canaryResult==='COMPROMISED')return'LEAKED';if(report.canaryResult==='SAFE')return'SAFE';return report.targetAfter?.canaryState??'UNKNOWN'}
function relativeTime(start:string,at:string){const ms=Math.max(0,new Date(at).getTime()-new Date(start).getTime());return ms<1000?`${ms}ms`:`${(ms/1000).toFixed(ms<10_000?1:0)}s`}

function fallbackContributions(report:IncidentReport,teams:string[]):TeamContribution[]{return array<TeamSummary>(report.teamSummaries).filter(team=>teams.includes(team.team)).map(team=>({team:team.team,summary:team.keyContribution[0]??`${team.findings} source-backed findings`,evidenceSources:team.evidenceSources??[]}))}

function communicationLanes(events:RuntimeEvent[]){
 const roles=new Map(events.filter(event=>event.eventType==='AGENT_CREATED'&&event.agentId).map(event=>[event.agentId!,String(event.data.role||event.agentId)]));
 const label=(id?:string)=>{const role=roles.get(id||'')||id||'system',upper=role.toUpperCase().replaceAll('_',' ');if(role==='coordinator')return'COMMAND';if(role==='operations_lead')return'OPS LEAD';if(role.endsWith('_lead'))return`${upper.replace(' LEAD','')} LEAD`;return upper;};
 const lanes=new Map<string,{from:string;to:string;count:number}>();
 for(const event of events.filter(item=>item.eventType==='AGENT_MESSAGE'&&item.agentId&&item.target)){const from=label(event.agentId),to=label(event.target),key=`${from}\u0000${to}`,current=lanes.get(key);if(current)current.count++;else lanes.set(key,{from,to,count:1});}
 return [...lanes.values()].sort((a,b)=>b.count-a.count||`${a.from}${a.to}`.localeCompare(`${b.from}${b.to}`)).slice(0,6);
}

function commandHandoff(report:IncidentReport,events:RuntimeEvent[]){
 const roles=new Map(events.filter(event=>event.eventType==='AGENT_CREATED'&&event.agentId).map(event=>[event.agentId!,String(event.data.role||'')]));
 const event=events.find(item=>item.eventType==='AGENT_MESSAGE'&&roles.get(item.agentId||'')==='coordinator'&&String(roles.get(item.target||'')).startsWith('operations'));
 if(!event)return undefined;
 const teams=(report.contributingTeams??[]).filter(team=>!['COMMAND','OPERATIONS','SENTINEL','OTHER'].includes(team));
 return {eventId:event.id,text:`Command transferred ${teams.length?teams.join(', '):'cross-team'} evidence to Operations with ${array(event.data.provenance).length} recorded provenance reference${array(event.data.provenance).length===1?'':'s'}.`};
}

function importantAgents(report:IncidentReport){const ranked=[...array<AgentSummary>(report.agentSummaries)].filter(agent=>!['COMMAND','SENTINEL','OTHER'].includes(agent.team)).sort((a,b)=>agentWeight(b)-agentWeight(a)||a.agentId.localeCompare(b.agentId)),seen=new Set<string>();return ranked.filter(agent=>!seen.has(agent.team)&&Boolean(seen.add(agent.team)))}
function agentWeight(agent:AgentSummary){return agent.contribution.length*20+agent.artifactsDiscovered.length*12+agent.policyEvents*10+agent.containmentActions.length*10+agent.messagesSent+agent.messagesReceived+agent.toolsAllowed}

function TeamCard({team}:{team:TeamSummary}){return <article className={`teamCard team-${team.team.toLowerCase()}`}><span>{team.team}</span><strong>{team.agentsInvolved} AGENTS</strong><p>{team.findings} findings · {team.tools} tools · {team.messages} messages</p><small>{team.evidenceSources?.length?`Evidence: ${team.evidenceSources.join(', ')}`:team.keyContribution.slice(0,2).join(' · ')||'No material contribution recorded'}</small><code>{team.finalState}</code></article>}
function TargetColumn({title,state}:{title:string;state?:TargetSnapshot}){return <div><span>{title}</span>{state?<><b>{state.systemStatus??'UNKNOWN'}</b><p>RELEASE {state.releaseId??'—'}<br/>DEPLOY {state.deploymentAuthority??'—'}<br/>VAULT {state.vaultState??'—'}<br/>CANARY {state.canaryState??'—'}</p></>:<p>Snapshot unavailable in this earlier report.</p>}</div>}
function Title({kicker,children}:{kicker:string;children:string}){return <header className="reportTitle"><div><h2>{children}</h2><span>{kicker}</span></div></header>}
function Datum({label,value}:{label:string;value:string}){return <p><b>{label}</b><span>{value}</span></p>}
function fallbackSummary(report:IncidentReport){return {whatHappened:report.objective||'A FLASH0VER range run was reconstructed from persisted telemetry.',whyItMattered:'The report contains only facts stored for this run.',result:report.canaryResult==='COMPROMISED'?'The collector received the current canary.':report.canaryResult==='SAFE'?'The collector remained clean and the canary stayed safe.':'The collector result was not confirmed.'}}
function category(event:RuntimeEvent):Filter{const type=event.eventType;if(type==='AGENT_MESSAGE'||type==='PROVENANCE_PROPAGATED'||type==='MESSAGE_BLOCKED')return'MESSAGES';if(type.startsWith('AGENT_')||type.startsWith('CAPABILITY_'))return'AGENTS';if(type.startsWith('TOOL_')||type.startsWith('WASMER_'))return'TOOLS';if(type.startsWith('HTTP_'))return'HTTP';if(type.startsWith('DECEPTION_')||type==='DECOY_RECORD_ACCESSED')return'DECEPTION';if(type.startsWith('POLICY_'))return'POLICY';if(type.startsWith('TARGET_')||type.startsWith('CANARY_')||type.startsWith('ATTACK_'))return'TARGET';if(type.startsWith('SENTINEL_')||type==='CONTAINMENT_APPLIED')return'SENTINEL';return'ALL'}
function safeDetails(event:RuntimeEvent){return {sequence:event.sequence,eventId:event.id,runId:event.runId,agentId:event.agentId,target:sanitize(event.target),eventType:event.eventType,summary:sanitize(event.summary),data:sanitize(event.data)}}
function sanitize(value:unknown):unknown{if(typeof value==='string')return value.replace(/sk-[A-Za-z0-9_-]{8,}/g,'[API KEY REDACTED]').replace(/([?&](?:grant|token|key|secret)=)[^&\s]+/gi,'$1[REDACTED]').replace(/f0_canary_[A-Za-z0-9_-]+/g,'[CANARY REDACTED]').slice(0,1000);if(Array.isArray(value))return value.slice(0,30).map(sanitize);if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value as Record<string,unknown>).filter(([key])=>!['body','message','task','result'].includes(key)).map(([key,item])=>[key,sanitize(item)]));return value}
function array<T=string>(value:unknown):T[]{return Array.isArray(value)?value as T[]:[]}
function count(events:RuntimeEvent[],type:string){return events.filter(event=>event.eventType===type).length}
function modeOf(event:RuntimeEvent){const report=event.data.report as Partial<IncidentReport>|undefined;return report?.mode??'RUN'}
function shortId(value:string){return value.length>19?`${value.slice(0,8)}…${value.slice(-6)}`:value}
function timeOf(value:string){return value?new Date(value).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'}):'—'}
function dateTime(value:string){return value?new Date(value).toLocaleString([],{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit'}):'—'}
function duration(ms:number|undefined){if(typeof ms!=='number')return'—';if(ms<1000)return`${Math.round(ms)}ms`;const seconds=Math.round(ms/1000);return seconds<60?`${seconds}s`:`${Math.floor(seconds/60)}m ${seconds%60}s`}
