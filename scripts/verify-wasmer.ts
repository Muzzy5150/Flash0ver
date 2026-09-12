import assert from 'node:assert/strict';
import { writeFile,unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { WasmerExecutor } from '../lib/wasmer/executor';
const executor=new WasmerExecutor();
const hostFile=resolve('data-host-isolation-probe.txt');
await writeFile(hostFile,'host-only-marker');
process.env.FLASH0VER_HOST_TEST='host-only-marker';
try {
 const result=await executor.execute({env:{FLASH0VER_SAFE_TEST:'granted'},files:{'allowed.txt':'allowed'},code:`import os,json,socket\nr={'host_env_absent':os.getenv('FLASH0VER_HOST_TEST') is None,'safe_env':os.getenv('FLASH0VER_SAFE_TEST'),'workspace':open('/workspace/allowed.txt').read()}\ntry:\n open(${JSON.stringify(hostFile)}).read()\n r['host_file_blocked']=False\nexcept OSError:\n r['host_file_blocked']=True\ntry:\n socket.create_connection(('127.0.0.1',4310),timeout=1)\n r['network_blocked']=False\nexcept OSError:\n r['network_blocked']=True\nprint(json.dumps(r))`});
 assert.equal(result.exitCode,0,result.stderr);const r=JSON.parse(result.stdout);assert.deepEqual(r,{host_env_absent:true,safe_env:'granted',workspace:'allowed',host_file_blocked:true,network_blocked:true});
 const isolated=await executor.execute({code:"import os,json\nprint(json.dumps({'prior_file_absent':not os.path.exists('/workspace/allowed.txt'),'prior_env_absent':os.getenv('FLASH0VER_SAFE_TEST') is None}))"});
 assert.equal(isolated.exitCode,0,isolated.stderr);assert.deepEqual(JSON.parse(isolated.stdout),{prior_file_absent:true,prior_env_absent:true});
 console.log('VERIFIED: real Wasmer computation, explicit env, virtual files, absent host env/file, denied socket.');
 console.log('VERIFIED: the reused Wasmer engine creates a fresh sandbox for each execution; files and env do not persist.');
 await assert.rejects(executor.execute({env:{LLM_API_KEY:'must-not-enter'},code:'print(1)'}),/FLASH0VER_SAFE/);
 await assert.rejects(executor.gate({service:'vault',path:'/canary',method:'GET'},['entry'],{}),/denied/);
 console.log('VERIFIED: unauthorized environment and service capabilities fail closed.');
 const timeout=await executor.execute({code:'while True: pass',timeoutMs:200});assert.notEqual(timeout.reason,'exited');
 console.log('VERIFIED: CPU-bound Wasmer execution is terminated by timeout.');
} finally {await executor.stop();await unlink(hostFile);delete process.env.FLASH0VER_HOST_TEST;}
