import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const roadmap=read('DEVELOPMENT-ROADMAP.md');
const manifest=JSON.parse(read('site-progress.json'));
const pipeline=read('pipeline-state.md');
const agents=read('AGENTS.md');
function markdownGates(){
  const lines=roadmap.split(/\r?\n/).filter(line=>/^\| G\d\d \|/.test(line));
  return lines.map(line=>{
    const a=line.split('|').slice(1,-1).map(x=>x.trim());
    assert.equal(a.length,5,'exact roadmap gate table columns');
    const [id,label,weight,status,evidence]=a;
    return {id:id.toLowerCase(),label,weight:Number(weight),status,evidence};
  });
}
test('authoritative full-vision roadmap and worker contract are explicit',()=>{
  assert.match(roadmap,/# B\/X RPG — Authoritative Development Roadmap/);
  assert.match(roadmap,/complete, replayable, text-first B\/X fantasy role-playing game/);
  assert.match(roadmap,/original B\/X mechanics/);
  assert.match(roadmap,/secure server-authoritative AI referee/i);
  assert.match(roadmap,/Replayable procedural adventures/);
  assert.match(roadmap,/seven original B\/X classes|seven original B\/X classes/i);
  assert.match(roadmap,/every accepted checkpoint must update this document/i);
  assert.match(roadmap,/2026-10-27 · Governance revision 1/);
  assert.match(agents,/DEVELOPMENT-ROADMAP\.md/);
  assert.match(agents,/every accepted development milestone/i);
});
test('21 authoritative roadmap gate definitions are mirrored exactly by published site data',()=>{
  const md=markdownGates();
  assert.equal(md.length,21,'all long-term gates counted');
  assert.equal(manifest.roadmap.gates.length,md.length);
  assert.deepEqual(manifest.roadmap.gates,md);
  assert.equal(new Set(md.map(g=>g.id)).size,md.length);
  assert.ok(md.every(g=>/^g\d\d$/.test(g.id)));
  assert.ok(md.every(g=>Number.isSafeInteger(g.weight)&&g.weight>0&&
    ['accepted','partial','planned'].includes(g.status)&&g.evidence.trim()));
});
test('whole-vision denominator is 100, accepted-only progress is 19, no partial credit',()=>{
  const gates=markdownGates();
  const total=gates.reduce((n,g)=>n+g.weight,0);
  const earned=gates.filter(g=>g.status==='accepted').reduce((n,g)=>n+g.weight,0);
  assert.equal(total,100);
  assert.equal(earned,19);
  assert.equal(gates.filter(g=>g.status==='accepted').length,6);
  assert.equal(gates.filter(g=>g.status==='partial').length,3);
  assert.match(roadmap,/Current earned progress: 19 \/ 100 = 19%/);
  assert.match(manifest.roadmap.note,/36%/);
  assert.equal(manifest.progress.completed,6);
  assert.equal(manifest.progress.total,9);
  assert.notEqual(manifest.progress.completed/manifest.progress.total,earned/total);
});
test('revision source matches latest accepted pipeline and governing roadmap, not candidate package edits',()=>{
  const source=manifest.revisionSource;
  assert.equal(source.file,'pipeline-state.md');
  const rx=new RegExp(source.pattern,source.flags||'m');
  const match=pipeline.match(rx);
  assert.ok(match,'accepted pipeline revision must be retrievable');
  const visible=String(source.prefix||'')+match[1]+String(source.suffix||'');
  assert.equal(visible,manifest.revision);
  const roadmapAccepted=roadmap.match(/\*\*Last fully accepted game revision:\*\* \*\*(v\d+\.\d+\.\d+)\*\*/);
  assert.ok(roadmapAccepted);
  assert.equal(roadmapAccepted[1],manifest.revision);
  assert.equal(manifest.roadmap.document,'DEVELOPMENT-ROADMAP.md');
  assert.match(manifest.roadmap.documentUrl,/\/blob\/main\/DEVELOPMENT-ROADMAP\.md$/);
});
test('legacy roadmap remains a pointer, rather than an independently competing progress model',()=>{
  const legacy=read('ROADMAP-COVERAGE.md');
  assert.match(legacy,/Legacy roadmap coverage reference — superseded/);
  assert.match(legacy,/DEVELOPMENT-ROADMAP\.md/);
  assert.match(legacy,/36\/100/);
  assert.match(legacy,/19\/100/);
});
