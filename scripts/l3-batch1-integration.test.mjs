import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {bundleEntry} from './load-bank.mjs';

export const expectedL3Routes = [
 ['eth-lacp','l2-lacp-etherchannel','lacp-modes-actor-key',['active','passive']],
 ['review-lldp-7','l2-lldp-neighbors','lldp-port-id-mgmt-address',['Port ID','Management Address']],
 ['l4-new-03','l3-mtu-mss-fragmentation','mtu-tcp-options-1448',['1448']],
 ['gap-pack2-02','l3-mtu-mss-fragmentation','mtu-ipv4-tcp-options-1444',['1444','24','32']],
 ['ts-pack1-15','l3-mtu-mss-fragmentation','mtu-local-pmtu-cache',['1380','1400']],
 ['gap-pack2-04','l3-mtu-mss-fragmentation','mtu-ipv6-ptb-transit',['1400','1560']],
 ['review-ptp-16','l2-ptp-time-sync','ptp-accuracy-shift-budget',['мкс','мс']],
 ['review-ptp-18','l2-ptp-time-sync','ptp-1step-e2e-tc',['Correction','1-step']],
 ['gap-pack1-03','l3-acl-filtering','acl-first-match-xy-implicit-deny',['X','Y','10.60.4.20','10.60.6.20']],
];
const m=await bundleEntry('scripts/in-depth-entry.ts','l3-batch1-integration.mjs');
assert.equal(expectedL3Routes.length,9);
assert.equal(new Set(expectedL3Routes.map(([,l])=>l)).size,5);
for(const [id,lessonId,anchor,concepts] of expectedL3Routes){
 const lesson=m.getLessonForQuestion(id);
 assert.equal(lesson?.id,lessonId,`${id}: exact resolver target`);
 assert.deepEqual(m.LESSONS.filter(l=>l.relatedQuestionIds.includes(id)).map(l=>l.id),[lessonId],`${id}: one canonical owner`);
 assert.equal(m.getLessonSectionForQuestion(lessonId,id),anchor);
 for(const mode of ['plain','professional']){
  const blocks=m.getLessonBlocksWithSections(lesson,mode);
  const matches=blocks.filter(b=>b.anchorId===anchor);
  assert.equal(matches.length,1,`${id}/${mode}: one actual anchor`);
  const checks=id==='eth-lacp'&&mode==='professional'?['System ID','Key','LACPDU']:concepts;
  for(const concept of checks)assert.ok(matches[0].body.toLowerCase().includes(concept.toLowerCase()),`${id}/${mode}: actual target explains ${concept}`);
 }
}
for(const [term,owner] of [['PMTUD','l3-mtu-mss-fragmentation'],['Boundary Clock','l2-ptp-time-sync'],['Transparent Clock','l2-ptp-time-sync'],['Grandmaster','l2-ptp-time-sync'],['LACPDU','l2-lacp-etherchannel']]){
 assert.equal(m.GLOSSARY[term]?.lessonId,owner,`${term}: final glossary after overlays`);
 const parts=m.splitGlossaryText(term).filter(p=>p.term);
 assert.equal(parts.length,1,`${term}: one actual inline glossary match`);
 assert.equal(m.GLOSSARY[parts[0].term]?.lessonId,owner,`${term}: canonical inline alias owner`);
 assert.ok(m.GLOSSARY_TOOLTIPS[parts[0].term]?.summary);
}
assert.equal(m.IN_DEPTH_TERMS.LACPDU.lessonId,'l2-lacp-etherchannel');
const glossary=readFileSync('src/data/glossary.ts','utf8');
const dictionary=glossary.slice(glossary.indexOf('export const GLOSSARY:'),glossary.indexOf('// Terms used as clickable tags'));
for(const term of ['PMTUD','Boundary Clock'])assert.equal(dictionary.split(`"${term}":`).length-1,1,`${term}: one own property in dictionary, tooltip metadata is a separate object`);
const lacpLesson=m.getLesson('l2-lacp-etherchannel');
assert.ok(lacpLesson.relatedQuestionIds.includes('eth-lacp'));
console.log('PASS: 9 exact routes x 2 modes, actual 1444 paragraph, 5 lessons, canonical owners and live glossary overlays/aliases');
