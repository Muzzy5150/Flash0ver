// Trusted persistent worker. Each command receives a fresh network-disabled
// Wasmer sandbox while the expensive Wasmer engine remains initialized.
import { parentPort, workerData } from 'node:worker_threads';
import { performance } from 'node:perf_hooks';
import { Wasmer } from '@wasmer/sdk/node';

const wasmer=new Wasmer({parallelism:1,outputBytes:16384,cache:{directory:workerData.cache}});
parentPort.postMessage({ready:true});
parentPort.on('message',job=>void run(job));

async function run(job){
 const setupStarted=performance.now();let sandbox;
 try {
  sandbox=await wasmer.sandboxes.create({packages:[workerData.package],files:{...job.files,'main.py':job.code},env:job.env,network:{mode:'disabled'}});
  const process=await sandbox.command('python',['/workspace/main.py']).spawn({timeoutMs:job.timeoutMs,outputBytes:16384,stdout:'capture',stderr:'capture'});
  const setupMs=performance.now()-setupStarted;parentPort.postMessage({id:job.id,started:true,pid:process.id,setupMs});
  const executionStarted=performance.now();const output=await process.wait();
  parentPort.postMessage({id:job.id,result:{exitCode:output.exitCode,reason:output.reason,stdout:output.stdout.text(),stderr:output.stderr.text()},setupMs,executionMs:performance.now()-executionStarted});
 } catch(error) {parentPort.postMessage({id:job.id,error:safe(error),setupMs:performance.now()-setupStarted});}
 finally {if(sandbox)await sandbox.close();}
}
function safe(error){return error instanceof Error?error.message:'Wasmer execution failed';}
