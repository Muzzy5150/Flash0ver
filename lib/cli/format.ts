import type { IncidentCategory, IncidentLine } from '../events/narration';
import type { Mode } from '../events/schema';

export const ansi={
 reset:'\u001b[0m',bold:'\u001b[1m',dim:'\u001b[2m',
 red:'\u001b[31m',brightRed:'\u001b[91m',green:'\u001b[32m',yellow:'\u001b[33m',
 blue:'\u001b[34m',magenta:'\u001b[35m',cyan:'\u001b[36m',white:'\u001b[97m',gray:'\u001b[90m'
} as const;

const artRows=[
 '███████╗██╗      █████╗ ███████╗██╗  ██╗ ██████╗ ██╗   ██╗███████╗██████╗',
 '██╔════╝██║     ██╔══██╗██╔════╝██║  ██║██╔═████╗██║   ██║██╔════╝██╔══██╗',
 '█████╗  ██║     ███████║███████╗███████║██║██╔██║██║   ██║█████╗  ██████╔╝',
 '██╔══╝  ██║     ██╔══██║╚════██║██╔══██║████╔╝██║╚██╗ ██╔╝██╔══╝  ██╔══██╗',
 '██║     ███████╗██║  ██║███████║██║  ██║╚██████╔╝ ╚████╔╝ ███████╗██║  ██║',
 '╚═╝     ╚══════╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝ ╚═════╝   ╚═══╝  ╚══════╝╚═╝  ╚═╝'
];
const artWidth=Math.max(...artRows.map(row=>row.length));
const centered=(value:string)=>`${' '.repeat(Math.max(0,Math.floor((artWidth-value.length)/2)))}${value}`;
export const FLASH0VER_ASCII=[...artRows,'',centered('RUNTIME CONTAINMENT FOR AUTONOMOUS AGENT SWARMS'),centered('By Muzzy5150')].join('\n');

export function colorize(value:string,color:string,enabled=true){return enabled?`${color}${value}${ansi.reset}`:value;}

export function renderBanner(color=true){
 const lines=FLASH0VER_ASCII.trimEnd().split('\n');
 return lines.map((line,index)=>colorize(line,index<6?ansi.brightRed:ansi.red,color)).join('\n');
}

export function redactTerminalText(value:unknown){
 return String(value??'')
  .replace(/\bBearer\s+\S+/gi,'Bearer [redacted]')
  .replace(/\b(?:sk|tk)-[A-Za-z0-9_-]{12,}\b/g,'[redacted credential]')
  .replace(/([?&](?:grant|token|key|secret|canary|auth)=)[^&\s]+/gi,'$1[redacted]')
  .replace(/\b[a-f0-9]{32,}\b/gi,'[redacted value]');
}

export function parseMode(value:string|undefined):Mode{
 const mode=value?.toUpperCase();
 if(mode==='OFF'||mode==='MONITOR'||mode==='ENFORCE')return mode;
 throw new Error('Mode must be OFF, MONITOR, or ENFORCE.');
}

export function categoryColor(category:IncidentCategory){
 const colors:Record<IncidentCategory,string>={activity:ansi.white,message:ansi.cyan,evidence:ansi.magenta,warning:ansi.yellow,block:ansi.brightRed,containment:ansi.green,outcome:ansi.brightRed,failure:ansi.red};
 return colors[category];
}

export function formatIncidentLine(line:IncidentLine,color=true){
 const time=new Date(line.timestamp).toLocaleTimeString([],{hour12:false});
 const actor=redactTerminalText(line.actor).slice(0,24).padEnd(24);
 const label=line.category.toUpperCase().padEnd(11);
 const text=redactTerminalText(line.text).replace(/\s+/g,' ').slice(0,180);
 return `${colorize(time,ansi.gray,color)}  ${colorize(label,categoryColor(line.category),color)} ${colorize(actor,ansi.cyan,color)} ${colorize(text,categoryColor(line.category),color)}`;
}

export function statusColor(status:string){if(status==='READY'||status==='SAFE'||status==='HEALTHY')return ansi.green;if(status==='DEGRADED'||status==='MONITOR')return ansi.yellow;return ansi.brightRed;}
