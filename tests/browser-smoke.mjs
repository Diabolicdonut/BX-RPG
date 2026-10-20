import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
const port=4179;
const node=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']});
let browser;
try {
  await delay(350);
  const executable=process.env.CHROMIUM_BIN || 'chromium';
  browser=spawn(executable,['--headless','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--virtual-time-budget=2500','--dump-dom',`http://127.0.0.1:${port}/`],{stdio:['ignore','pipe','pipe']});
  let stdout='',stderr='';
  browser.stdout.on('data', chunk => {stdout += chunk.toString();});
  browser.stderr.on('data', chunk => {stderr += chunk.toString();});
  const status=await Promise.race([new Promise(resolve=>browser.on('close',resolve)), delay(16000).then(()=>{browser.kill('SIGKILL');throw Error('Chromium timed out');})]);
  if(status!==0||!stdout.includes('data-boot-status="ready"')||!stdout.includes('Demo shell ready.')||!stdout.includes('Sample Fighter')||!stdout.includes('4/4'))throw Error(`Browser smoke failed status=${status}; dom=${stdout.slice(-1000)}; stderr=${stderr.slice(-500)}`);
  console.log('Browser DOM smoke passed (Chromium headless, module boot and state render).');
} finally {node.kill();if(browser&&!browser.killed)browser.kill();}
