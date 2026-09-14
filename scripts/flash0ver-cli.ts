#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { emitKeypressEvents } from 'node:readline';
import { narrateEvent } from '../lib/events/narration';
import { EventSchema, type Mode, type RuntimeEvent } from '../lib/events/schema';
import { ansi, colorize, formatIncidentLine, parseMode, redactTerminalText, renderBanner, statusColor } from '../lib/cli/format';

const args=process.argv.slice(2);const command=(args[0]??'menu').toLowerCase();
const color=!args.includes('--no-color')&&(Boolean(process.env.FORCE_COLOR)||(!process.env.NO_COLOR&&Boolean(process.stdout.isTTY)));
const base=(process.env.FLASHOVER_CONTROL_URL??'http://127.0.0.1:4310').replace(/\/$/,'');
let managedStack:ReturnType<typeof spawn>|undefined;

if(command!=='completion')console.log(renderBanner(color));

try{
 if(command==='menu'||command==='interactive')await interactive();
 else if(command==='help'||command==='--help'||command==='-h')help();
 else if(command==='start'||command==='serve')await start();
 else if(command==='preflight')await preflight();
 else if(command==='status')await status();
 else if(command==='mode')await setMode(parseMode(args[1]));
 else if(command==='run')await run(modeArgument(args));
 else if(command==='watch')await watch();
 else if(command==='reset')await action('/api/reset','Range reset; canary rotated and collector cleared.');
 else if(command==='kill')await action('/api/kill','Swarm stop requested.');
 else if(command==='completion')console.log('menu help start preflight status mode run watch reset kill');
 else throw new Error(`Unknown command: ${command}. Run "npm run cli -- help".`);
}catch(error){console.error(colorize(`\nERROR  ${safeError(error)}`,ansi.brightRed,color));process.exitCode=1;}finally{await stopManagedStack();}

function help(){console.log(`
${paint('USAGE',ansi.brightRed)}
  npm run cli                      Open the interactive command menu
  npm run cli -- <command> [options]

${paint('COMMANDS',ansi.brightRed)}
  menu                        Guided arrow-key command interface
  start                       Start the local Range V2 dashboard and control plane
  preflight                   Verify model, Wasmer, database, range, and collector
  status                      Show the current control-plane and target state
  mode OFF|MONITOR|ENFORCE    Select a policy mode
  run [--mode MODE]           Start a real run and follow source-backed telemetry
  watch                       Follow the current or most recent run
  reset                       Reset the range and rotate the canary
  kill                        Request bounded swarm termination

${paint('OPTIONS',ansi.brightRed)}
  --no-color                  Disable ANSI colors

${paint('EXAMPLES',ansi.brightRed)}
  npm run cli
  npm run cli -- start
  npm run cli -- preflight
  npm run cli -- run --mode ENFORCE
`);}

type MenuOption<T extends string>={value:T;label:string;description:string};

async function interactive(){
 if(!process.stdin.isTTY||!process.stdout.isTTY)throw new Error('Interactive mode requires a terminal. Run "npm run cli -- help" for direct commands.');
 let open=true;while(open){
  const choice=await selectOption('FLASH0VER COMMAND',[
   {value:'guided',label:'GUIDED RUN',description:'Preflight, choose policy, approve launch, stream real telemetry'},
   {value:'status',label:'RUNTIME STATUS',description:'Inspect control plane, target, canary, and recent run'},
   {value:'preflight',label:'SYSTEM PREFLIGHT',description:'Verify every required local dependency'},
   {value:'watch',label:'WATCH TELEMETRY',description:'Follow the current or most recent source-backed run'},
   {value:'start',label:'START LOCAL RANGE',description:'Launch the ACME Range V2 stack in this CLI session'},
   {value:'reset',label:'RESET RANGE',description:'Rotate the canary and restore target state'},
   {value:'kill',label:'KILL SWARM',description:'Request bounded termination of active agents'},
   {value:'exit',label:'EXIT',description:'Close the command interface'}
  ] as const);
  try{
   if(choice==='guided')await guidedRun();
   else if(choice==='status'){await ensureOnline(false);await status();await returnToMenu();}
   else if(choice==='preflight'){await ensureOnline(false);await preflight(false);await returnToMenu();}
   else if(choice==='watch'){await ensureOnline(false);await watch();await returnToMenu();}
   else if(choice==='start'){await launchManagedStack();await returnToMenu();}
   else if(choice==='reset'){await ensureOnline(false);if(await confirmAction('RESET THE LOCAL RANGE','Restore ACME, rotate the canary, and clear the collector?'))await action('/api/reset','Range reset; canary rotated and collector cleared.');await returnToMenu();}
   else if(choice==='kill'){await ensureOnline(false);if(await confirmAction('STOP THE ACTIVE SWARM','Request bounded termination of the current run?'))await action('/api/kill','Swarm stop requested.');await returnToMenu();}
   else open=false;
  }catch(error){console.error(colorize(`\nERROR  ${safeError(error)}`,ansi.brightRed,color));await returnToMenu();}
 }
}

async function guidedRun(){
 await ensureOnline(true);
 console.log(`\n${paint('STEP 1 / 3',ansi.brightRed)}  SYSTEM READINESS`);const ready=await preflight(false);if(!ready){console.log(paint('\nGUIDED RUN BLOCKED · resolve mandatory preflight failures.',ansi.brightRed));await returnToMenu();return;}
 const mode=await selectOption('STEP 2 / 3 · SELECT POLICY MODE',[
  {value:'OFF',label:'OFF',description:'Observe only; policy does not block sensitive composition'},
  {value:'MONITOR',label:'MONITOR',description:'Allow activity and emit deterministic policy warnings'},
  {value:'ENFORCE',label:'ENFORCE',description:'Block policy-violating sensitive actions while ordinary work continues'},
  {value:'BACK',label:'BACK',description:'Return to the command menu without starting a run'}
 ] as const);if(mode==='BACK')return;
 const decision=await selectOption(`STEP 3 / 3 · ${mode} READY`,[
  {value:'launch',label:'APPROVE & LAUNCH',description:'Start a fresh real model-driven run and follow live telemetry'},
  {value:'back',label:'GO BACK',description:'Change the selection without starting a run'}
 ] as const);if(decision==='back')return;await run(mode);await returnToMenu();
}

async function confirmAction(title:string,description:string){return await selectOption(title,[{value:'yes',label:'APPROVE',description},{value:'no',label:'CANCEL',description:'Return without making the change'}] as const)==='yes';}
async function returnToMenu(){await selectOption('CONTINUE',[{value:'menu',label:'RETURN TO MENU',description:'Choose another FLASH0VER command'}] as const);}

async function selectOption<T extends string>(title:string,options:readonly MenuOption<T>[]):Promise<T>{
 let selected=0;const lines=options.length+2;emitKeypressEvents(process.stdin);const wasRaw=process.stdin.isRaw;process.stdin.setRawMode?.(true);process.stdin.resume();
 const draw=(initial:boolean)=>{if(!initial)process.stdout.write(`\u001b[${lines}A`);const width=Math.max(48,process.stdout.columns??100);process.stdout.write(`\u001b[2K\r${paint(title,ansi.brightRed)}\n`);for(let index=0;index<options.length;index++){const option=options[index];const active=index===selected;const marker=active?'❯':' ';const label=option.label.padEnd(22);const description=option.description.slice(0,Math.max(8,width-28));process.stdout.write(`\u001b[2K\r${active?paint(`${marker} ${label}`,ansi.brightRed):colorize(`${marker} ${label}`,ansi.white,color)} ${colorize(description,active?ansi.white:ansi.gray,color)}\n`);}process.stdout.write(`\u001b[2K\r${colorize('  Use ↑/↓ or number keys · Enter to select · Esc to go back',ansi.gray,color)}\n`);};
 draw(true);return await new Promise<T>(resolve=>{const finish=(value:T)=>{process.stdin.off('keypress',onKey);process.stdin.setRawMode?.(wasRaw??false);process.stdin.pause();process.stdout.write('\u001b[?25h\n');resolve(value);};const onKey=(_input:string,key:{name?:string;ctrl?:boolean})=>{if(key.ctrl&&key.name==='c')return finish(options.at(-1)!.value);if(key.name==='up'){selected=(selected-1+options.length)%options.length;draw(false);}else if(key.name==='down'){selected=(selected+1)%options.length;draw(false);}else if(key.name==='return')finish(options[selected].value);else if(key.name==='escape')finish(options.at(-1)!.value);else if(/^[1-9]$/.test(key.name??'')){const index=Number(key.name)-1;if(index<options.length){selected=index;draw(false);finish(options[selected].value);}}};process.stdout.write('\u001b[?25l');process.stdin.on('keypress',onKey);});
}

async function ensureOnline(offerStart:boolean){if(await controlPlaneOnline())return;if(!offerStart)throw new Error(`Control plane unavailable at ${base}. Choose START LOCAL RANGE first.`);const choice=await selectOption('LOCAL CONTROL PLANE OFFLINE',[{value:'start',label:'START RANGE V2',description:'Launch the disposable local ACME target and continue'},{value:'back',label:'BACK',description:'Return without starting local services'}] as const);if(choice==='back')throw new Error('Guided run cancelled.');await launchManagedStack();}

async function launchManagedStack(){
 if(await controlPlaneOnline()){console.log(`${paint('\nREADY',ansi.green)}  Local control plane is already running.`);return;}
 console.log(`${paint('\nSTARTING',ansi.yellow)}  ACME Range V2 · local disposable target`);let launchLog='';managedStack=spawn('npm',['run','dev'],{cwd:process.cwd(),detached:true,stdio:['ignore','pipe','pipe'],env:{...process.env,FLASHOVER_RANGE:process.env.FLASHOVER_RANGE??'v2',TARGET_RUNTIME:process.env.TARGET_RUNTIME??'local'}});const collect=(chunk:Buffer)=>{launchLog=`${launchLog}${chunk.toString('utf8')}`.slice(-3000);};managedStack.stdout?.on('data',collect);managedStack.stderr?.on('data',collect);const deadline=Date.now()+30000;while(Date.now()<deadline){if(await controlPlaneOnline()){console.log(`${paint('READY',ansi.green)}  Range V2 control plane listening at ${base}`);return;}if(managedStack.exitCode!==null)break;await new Promise(resolve=>setTimeout(resolve,300));}throw new Error(`Local stack failed to become ready. ${redactTerminalText(launchLog.split('\n').filter(Boolean).at(-1)??'No launch error was reported.')}`);
}

async function stopManagedStack(){if(!managedStack?.pid||managedStack.exitCode!==null)return;try{process.kill(-managedStack.pid,'SIGTERM');await Promise.race([once(managedStack,'exit'),new Promise(resolve=>setTimeout(resolve,3000))]);}catch{}managedStack=undefined;}
async function controlPlaneOnline(){try{const response=await fetch(`${base}/api/target`,{signal:AbortSignal.timeout(1200)});return response.ok;}catch{return false;}}

async function start(){
 console.log(`${paint('START',ansi.green)}  Range V2 · local disposable target · http://127.0.0.1:3000\n`);
 const child=spawn('npm',['run','dev'],{cwd:process.cwd(),stdio:'inherit',env:{...process.env,FLASHOVER_RANGE:process.env.FLASHOVER_RANGE??'v2',TARGET_RUNTIME:process.env.TARGET_RUNTIME??'local'}});
 const forward=(signal:NodeJS.Signals)=>{if(!child.killed)child.kill(signal);};process.once('SIGINT',forward);process.once('SIGTERM',forward);
 const [code,signal]=await once(child,'exit') as [number|null,NodeJS.Signals|null];process.off('SIGINT',forward);process.off('SIGTERM',forward);
 if(code!==0&&signal!=='SIGINT'&&signal!=='SIGTERM')throw new Error(`Local stack exited with ${signal??`code ${code}`}.`);
}

async function preflight(exitOnBlocked=true){
 const reply=await request<{checks:{name:string;status:string;detail:string}[]}>('/api/preflight');
 console.log(paint('\nSYSTEM PREFLIGHT',ansi.bold));
 for(const check of reply.checks)console.log(`  ${paint(check.status.padEnd(9),statusColor(check.status))} ${paint(check.name.padEnd(17),ansi.white)} ${colorize(redactTerminalText(check.detail),ansi.gray,color)}`);
 const blocked=reply.checks.some(check=>check.status==='BLOCKED');if(blocked&&exitOnBlocked)process.exitCode=2;return !blocked;
}

async function status(){
 const state=await request<State>('/api/state');const events=validEvents(state.events);const runId=state.currentRunId??events.findLast(event=>event.eventType==='RUN_STARTED')?.runId;
 const current=runId?events.filter(event=>event.runId===runId):[];const target=state.target?.state;
 const rows=[['CONTROL',state.active?'RUNNING':'IDLE'],['MODE',state.mode],['RANGE',`${state.target?.version?.toUpperCase()??'UNKNOWN'} · ${redactTerminalText(state.target?.identity??'unavailable')}`],['TARGET',target?.systemStatus??'UNKNOWN'],['CANARY',target?.canaryState??'UNKNOWN'],[state.currentRunId?'RUN':'RECENT RUN',runId??'NONE'],['AGENTS',String(new Set(current.filter(event=>event.eventType==='AGENT_CREATED').map(event=>event.agentId)).size)],['LAST EVENT',current.at(-1)?.eventType??'NONE']];
 console.log(paint('\nRUNTIME STATUS',ansi.bold));for(const [label,value] of rows)console.log(`  ${colorize(label.padEnd(12),ansi.gray,color)} ${paint(value,statusColor(value))}`);
}

async function setMode(mode:Mode){await request('/api/mode',{method:'POST',body:JSON.stringify({mode})});console.log(`${paint('MODE',ansi.green)}  ${paint(mode,mode==='ENFORCE'?ansi.brightRed:mode==='MONITOR'?ansi.yellow:ansi.white)}`);}

async function run(mode:Mode){
 const state=await request<State>('/api/state');if(state.active)throw new Error('A run is already active. Use "watch" to follow it.');
 const after=validEvents(state.events).at(-1)?.sequence??0;await setMode(mode);await request('/api/run',{method:'POST',body:'{}'});
 console.log(`${paint('\nLIVE RUN',ansi.brightRed)}  ${mode} · waiting for real runtime telemetry\n`);await stream({after,discoverRun:true});
}

async function watch(){
 const state=await request<State>('/api/state');const events=validEvents(state.events);const runId=state.currentRunId??events.findLast(event=>event.eventType==='RUN_STARTED')?.runId;if(!runId)throw new Error('No current or completed run is available.');
 const current=events.filter(event=>event.runId===runId);console.log(`${paint('\nWATCH',ansi.brightRed)}  ${short(runId)} · ${state.active?'LIVE':'RECENT'}\n`);
 for(const event of current.slice(-80))printEvent(event);if(!state.active){printSummary(current);return;}await stream({after:events.at(-1)?.sequence??0,runId});
}

async function stream(options:{after:number;runId?:string;discoverRun?:boolean}){
 const controller=new AbortController();const stop=()=>controller.abort();process.once('SIGINT',stop);let selected=options.runId;const seen:RuntimeEvent[]=[];
 try{
  const response=await fetch(`${base}/api/events?after=${options.after}`,{signal:controller.signal});if(!response.ok||!response.body)throw new Error(`Event stream returned HTTP ${response.status}.`);
  let buffer='';for await(const chunk of response.body){buffer+=Buffer.from(chunk).toString('utf8');let boundary=buffer.indexOf('\n\n');while(boundary>=0){const block=buffer.slice(0,boundary);buffer=buffer.slice(boundary+2);boundary=buffer.indexOf('\n\n');const data=block.split('\n').find(line=>line.startsWith('data: '))?.slice(6);if(!data)continue;const event=EventSchema.parse(JSON.parse(data));if(options.discoverRun&&!selected&&event.eventType==='RUN_STARTED')selected=event.runId;if(!selected||event.runId!==selected)continue;seen.push(event);printEvent(event);if(isTerminal(event)){printSummary(seen);controller.abort();return;}}}
 }catch(error){if(!controller.signal.aborted)throw error;}finally{process.off('SIGINT',stop);}
}

function printEvent(event:RuntimeEvent){const line=narrateEvent(event);if(line)console.log(formatIncidentLine(line,color));}
function printSummary(events:RuntimeEvent[]){if(!events.length)return;const started=events.find(event=>event.eventType==='RUN_STARTED');const finished=events.findLast(isTerminal);const duration=started&&finished?new Date(finished.timestamp).getTime()-new Date(started.timestamp).getTime():undefined;const outcome=events.findLast(event=>event.eventType==='RUN_FINISHED')?.data.outcome??(events.some(event=>event.eventType==='CANARY_LEAK')?'compromised':events.some(event=>event.eventType==='CANARY_SAFE')?'contained':'unconfirmed');const counts={agents:new Set(events.filter(event=>event.eventType==='AGENT_CREATED').map(event=>event.agentId)).size,models:events.filter(event=>event.eventType==='MODEL_RESPONSE').length,tools:events.filter(event=>event.eventType==='TOOL_REQUEST').length,warnings:events.filter(event=>event.eventType==='POLICY_WARNING').length,blocks:events.filter(event=>event.eventType==='POLICY_BLOCK').length};console.log(`\n${paint('RUN COMPLETE',outcome==='contained'?ansi.green:outcome==='compromised'?ansi.brightRed:ansi.yellow)}  ${String(outcome).toUpperCase()}${duration===undefined?'':` · ${(duration/1000).toFixed(2)}s`}`);console.log(`  AGENTS ${counts.agents} · MODEL ${counts.models} · TOOLS ${counts.tools} · WARNINGS ${counts.warnings} · BLOCKS ${counts.blocks}`);}
async function action(path:string,message:string){await request(path,{method:'POST',body:'{}'});console.log(`${paint('OK',ansi.green)}  ${message}`);}
async function request<T=unknown>(path:string,init?:RequestInit):Promise<T>{let response:Response;try{response=await fetch(`${base}${path}`,{...init,headers:{'content-type':'application/json',...init?.headers},signal:AbortSignal.timeout(path==='/api/preflight'?60000:15000)});}catch{throw new Error(`Control plane unavailable at ${base}. Start it with "npm run cli -- start".`);}const text=await response.text();const value=text?JSON.parse(text):{};if(!response.ok)throw new Error(redactTerminalText((value as {error?:string}).error??`HTTP ${response.status}`));return value as T;}
function modeArgument(values:string[]){const index=values.findIndex(value=>value==='--mode'||value==='-m');return parseMode(index>=0?values[index+1]:values[1]??'OFF');}
function validEvents(value:unknown){if(!Array.isArray(value))return[];return value.flatMap(item=>{const parsed=EventSchema.safeParse(item);return parsed.success?[parsed.data]:[];});}
function isTerminal(event:RuntimeEvent){return ['RUN_FINISHED','RUN_FAILED','RUN_STOPPED'].includes(event.eventType);}
function safeError(error:unknown){return redactTerminalText(error instanceof Error?error.message:'CLI operation failed.');}
function short(value:string){return value.length>16?`${value.slice(0,8)}…${value.slice(-6)}`:value;}
function paint(value:string,tone:string){return colorize(value,tone,color);}
type State={mode:Mode;active:boolean;currentRunId?:string;events:unknown[];target?:{identity?:string;version?:string;state?:{systemStatus?:string;canaryState?:string}}};
