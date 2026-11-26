import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { bundleEntry } from './load-bank.mjs';

const { getLesson, getLessonForQuestion }=await bundleEntry('scripts/in-depth-entry.ts','poe-injectors-lesson-check.mjs');
const lesson=getLesson('l1-poe-injectors-splitters');
assert.ok(lesson,'PoE injector-splitter lesson registered');
assert.ok(lesson.professional?.blocks?.length>=8,'Enough professional blocks');
assert.ok(lesson.blocks.length>=5,'Enough beginner blocks');
assert.ok(lesson.relatedQuestionIds.includes('l1v2-c-injector-direction'));
assert.equal(getLessonForQuestion('l1v2-c-injector-direction')?.id,lesson.id);

const expected={plain:['B','A','C'],pro:['B','C','D','A','C']};
for(const [kind,group] of [['plain',lesson.plainKnowledgeCheck],['pro',lesson.knowledgeCheck]]){
  assert.equal(group.questions.length,expected[kind].length,`${kind}: question count unchanged`);
  const ids=group.questions.map(q=>q.id);
  assert.equal(new Set(ids).size,ids.length,`${kind}: unique question IDs`);
  assert.deepEqual(group.questions.map(q=>q.correctChoiceId),expected[kind],`${kind}: answer keys unchanged`);
  for(const q of group.questions){
    assert.equal(q.choices.length,4,`${q.id}: four options`);
    assert.ok(q.choices.some(c=>c.id===q.correctChoiceId),q.id);
    assert.ok(q.explanation.trim().length>35,q.id);
    assert.ok(q.prompt.trim().length>25,q.id);
  }
}
const allPlain=lesson.blocks.map(b=>b.body).join(' ');
const allPro=lesson.professional.blocks.map(b=>b.body).join(' ');
for(const term of ['Data IN','Data + Power OUT','сплиттер','пассив','12 В','18 Вт','RJ-45'])
  assert.ok(allPlain.includes(term),`Plain must teach ${term}`);
for(const term of ['Alternative A','Alternative B','802.3at','DC/DC','Midspan','show power inline','пусков'])
  assert.ok(allPro.includes(term),`Pro must teach ${term}`);
const linked=[...lesson.blocks,...lesson.professional.blocks].map(b=>b.relatedLesson?.id).filter(Boolean);
for(const id of ['l1-poe-budget','l1-poe-screen-reading','cli-poe-diagnostics']){
  assert.ok(linked.includes(id),`missing lesson link ${id}`);
  assert.ok(getLesson(id),`broken lesson link ${id}`);
}
const images=[...lesson.blocks,...lesson.professional.blocks].map(b=>b.cheatsheet?.file).filter(Boolean);
for(const file of new Set(images)){
  const p='public/lesson-images/'+file;
  assert.ok(existsSync(p),`Missing actual schematic: ${p}`);
  if(file.endsWith('.png')) {
    const bytes=readFileSync(p);
    assert.deepEqual([...bytes.subarray(0,8)],[137,80,78,71,13,10,26,10],`${p}: PNG signature`);
    assert.equal(createHash('sha256').update(bytes).digest('hex'),'1bd10cfa3d788a9af1d30b8e96e5b1858f1ac0ebbe4e45b333966dfec6d7b57f','Exact owner-approved attachment, without modification');
    assert.equal(bytes.readUInt32BE(16),1536);assert.equal(bytes.readUInt32BE(20),1024);
    continue;
  }
  const svg=readFileSync(p,'utf8');
  assert.ok(svg.startsWith('<svg'),p);
  assert.match(svg,/<title[^>]*>[^<]+<\/title>/,`${p}: accessible title`);
  assert.match(svg,/<desc[^>]*>[^<]+<\/desc>/,`${p}: accessible description`);
  assert.doesNotMatch(svg,/<script|foreignObject|href=/i,`${p}: no scripts/external loads`);
}
assert.equal(lesson.blocks[0].cheatsheet?.file,'poe-injectors-splitters-approved.png','Plain mode visually recognizes hardware');
assert.equal(lesson.professional.blocks[0].cheatsheet?.file,'poe-injector-splitter-chains.svg','Professional mode retains A/B/C flow');
assert.ok(lesson.professional.blocks.some(b=>b.cheatsheet?.file==='poe-ieee-vs-passive-compare.svg'),'Professional mode retains second comparison');
const plainAssets=new Set(lesson.blocks.map(b=>b.cheatsheet?.file).filter(Boolean));
const proAssets=new Set(lesson.professional.blocks.map(b=>b.cheatsheet?.file).filter(Boolean));
assert.ok([...plainAssets].every(x=>!proAssets.has(x)),'No duplicate schematics between modes');
assert.ok(images.includes('poe-injector-splitter-chains.svg'));
assert.ok(images.includes('poe-ieee-vs-passive-compare.svg'));
assert.match(allPlain,/не (?:подключай|подавай)|НЕ подключай/i,'Passive safety notice');
assert.match(allPro,/18 Вт/,'Professional DC calculation');
for(const [file,sha] of Object.entries({'poe-injector-splitter-chains.svg':'405444045682751a9b38ba3070e489426b22bc260ea851fa0930ce9dcbfb535e','poe-ieee-vs-passive-compare.svg':'7acf3e4c2738e4a1506f86e95e2714f5c83cdb887411883c2e3a563563f6e132'})) assert.equal(createHash('sha256').update(readFileSync('public/lesson-images/'+file)).digest('hex'),sha,`${file}: original Pro SVG bytes unchanged`);
assert.match(lesson.blocks[0].cheatsheet.alt,/ИИ.*фотореалистичная.*иллюстрация/);
assert.match(lesson.blocks[0].cheatsheet.note,/сгенерировано ИИ.*не фотография реального брендового оборудования/);
console.log('PASS: exact approved PNG, complete 3+5 questions/keys valid, original Pro SVGs intact');
