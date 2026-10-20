import {spawn} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
const port=4179;
const server=spawn(process.execPath,['scripts/serve.mjs'],{
  env:{...process.env,PORT:String(port)},stdio:['ignore','pipe','pipe']
});
const executable=process.env.CHROMIUM_BIN||'chromium';
async function dumpPage(path){
  const browser=spawn(executable,['--headless','--no-sandbox','--disable-gpu',
    '--disable-dev-shm-usage','--virtual-time-budget=4000','--dump-dom',
    `http://127.0.0.1:${port}/${path}`],{stdio:['ignore','pipe','pipe']});
  let stdout='',stderr='',timedOut=false;
  browser.stdout.on('data',chunk=>{stdout+=chunk.toString();});
  browser.stderr.on('data',chunk=>{stderr+=chunk.toString();});
  const watchdog=setTimeout(()=>{timedOut=true;browser.kill('SIGKILL');},15000);
  try {
    const code=await new Promise((resolve,reject)=>{
      browser.once('close',resolve);
      browser.once('error',reject);
    });
    if(timedOut||code!==0)throw Error(`Browser process failed ${path}: status ${code}, stderr=${stderr.slice(-800)}`);
    return stdout;
  } finally {clearTimeout(watchdog);if(!browser.killed)browser.kill();}
}
try {
  await delay(350);
  const boot=await dumpPage('');
  if(!boot.includes('data-boot-status="ready"') ||
    !boot.includes('B/X surprise boundary ready.') ||
    !boot.includes('Sample Fighter') || !boot.includes('4/4') ||
    !boot.includes('6 turns remaining'))throw Error(`Browser boot smoke failed: ${boot.slice(-1200)}`);
  const probe=await dumpPage('tests/browser-probe.html');
  if(!probe.includes('data-smoke-status="passed"') || !probe.includes('save/load passed.'))
    throw Error(`Browser command smoke failed: ${probe.slice(-1800)}`);
  const contact=await dumpPage('tests/encounter-browser-probe.html');
  if(!contact.includes('data-smoke-status="passed"') ||
     !contact.includes('contact, visibility filtering, RNG, save/load, and refusals passed.'))
    throw Error(`Encounter browser smoke failed: ${contact.slice(-2000)}`);
  const surprise=await dumpPage('tests/surprise-browser-probe.html');
  if(!surprise.includes('data-smoke-status="passed"') ||
    !surprise.includes('surprise, visibility, replay, save/load, and refusals passed.'))
    throw Error(`Surprise browser smoke failed: ${surprise.slice(-2000)}`);
  console.log('Browser smoke passed: boot, rest/time/light, encounter contact, surprise, public visibility, save/load, refusals.');
} finally {server.kill();}
