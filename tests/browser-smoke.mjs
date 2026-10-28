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
    !boot.includes('B/X B24 running-budget prerequisite ready.') ||
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
    !surprise.includes('Surprise, visibility, replay, save/load, and refusals passed.'))
    throw Error(`Surprise browser smoke failed: status=${surprise.match(/data-smoke-status="([^"]+)"/)?.[1]}; report=${surprise.match(/<pre id="result">([\s\S]*?)<\/pre>/)?.[1]}; leading=${surprise.slice(0,800)}`);
  const perception=await dumpPage('tests/perception-browser-probe.html');
  if(!perception.includes('data-smoke-status="passed"') ||
    !perception.includes('Perception visibility, narration, persistence and refusals passed.'))
    throw Error(`Perception browser smoke failed: ${perception.slice(0,1600)}`);
  const handoff=await dumpPage('tests/handoff-browser-probe.html');
  if(!handoff.includes('data-smoke-status="passed"') ||
    !handoff.includes('Handoff continuity, persistence, knowledge filtering and refusals passed.'))
    throw Error(`Handoff browser smoke failed: ${handoff.slice(0,1600)}`);
  const closed=await dumpPage('tests/disposition-browser-probe.html');
  if(!closed.includes('data-smoke-status="passed"') ||
    !closed.includes('Verified nonpursuit, turn accounting, knowledge and save/load passed.'))
    throw Error(`Disposition browser smoke failed: ${closed.slice(0,1400)}`);
  const monsterWithdrawal=await dumpPage('tests/monster-withdrawal-browser-probe.html');
  if(!monsterWithdrawal.includes('data-smoke-status="passed"') ||
     !monsterWithdrawal.includes('Monster withdrawal, no pursuit, strict save and resumption passed.'))
    throw Error(`Monster-withdrawal Chrome smoke failed: ${monsterWithdrawal.slice(0,1700)}`);
  const progress=await dumpPage('tests/roadmap-browser-probe.html');
  if(!progress.includes('data-smoke-status="passed"') ||
    !progress.includes('Roadmap widget revision, full-vision 19%, 21 gates and phase basis passed.'))
    throw Error(`Full-vision roadmap browser smoke failed: ${progress.slice(0,2000)}`);
  const pursued=await dumpPage('tests/pursuit-browser-probe.html');
  if(!pursued.includes('data-smoke-status="passed"') ||
    !pursued.includes('B/X pursuit choice, no simulated movement, legacy saves and refusal passed.'))
    throw Error(`Pursuit decision Chrome smoke failed: ${pursued.slice(0,1750)}`);
  const rateReview=await dumpPage('tests/rate-review-browser-probe.html');
  if(!rateReview.includes('data-smoke-status="passed"') ||
    !rateReview.includes('Source-backed B19 rate audit, missing party gear and save refusals passed.'))
    throw Error(`B19 pursuit rate Chrome probe failed: ${rateReview.slice(0,1700)}`);
  const witnessed=await dumpPage('tests/equipment-browser-probe.html');
  if(!witnessed.includes('data-smoke-status="passed"') ||
    !witnessed.includes('Original B20 public equipment rate, save integrity and no chase passed.'))
    throw Error(`Public B20 equipment Chrome smoke failed: ${witnessed.slice(0,1700)}`);
  const budgeted=await dumpPage('tests/pursuit-budget-browser-probe.html');
  if(!budgeted.includes('data-smoke-status="passed"') ||
    !budgeted.includes('B24 zero-elapsed pursuit budget, migrations and refusals passed.'))
    throw Error(`B24 pursuit-budget Chrome probe failed: ${budgeted.slice(0,1850)}`);
  console.log('Browser smoke passed: boot, encounter, both dispositions, save/load and authoritative 19% full-vision roadmap.');

} finally {server.kill();}
