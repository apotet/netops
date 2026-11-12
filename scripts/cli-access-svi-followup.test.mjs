import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

mkdirSync(resolve('scripts/.cache'), { recursive: true });
const outfile=resolve('scripts/.cache/cli-access-svi-followup.mjs');
await build({stdin:{contents:`
export { LabEngine } from './src/cli-lab/engine/LabEngine';
export { ciscoIosProfile } from './src/cli-lab/vendors/cisco-ios/profile';
export { ciscoIosCommands } from './src/cli-lab/vendors/cisco-ios/commands';
export { ciscoVlanAccessScenario } from './src/cli-lab/scenarios/cisco-vlan-access';
export { ciscoAccessSviFollowupScenario } from './src/cli-lab/scenarios/cisco-access-svi-followup';
export { ciscoTwoSwitchSviScenario } from './src/cli-lab/scenarios/cisco-two-switch-svi';
export { PRACTICE_DESTINATIONS } from './src/data/practiceLinks';
export { getLesson } from './src/data/lessons/index';
`,resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',outfile,logLevel:'silent'});
const {LabEngine,ciscoIosProfile,ciscoIosCommands,ciscoVlanAccessScenario,ciscoAccessSviFollowupScenario,ciscoTwoSwitchSviScenario,PRACTICE_DESTINATIONS,getLesson}=await import(pathToFileURL(outfile).href);
const first=ciscoVlanAccessScenario, sequel=ciscoAccessSviFollowupScenario;
assert.equal(first.nextScenarioId,sequel.id);
assert.equal(sequel.nextScenarioId,ciscoTwoSwitchSviScenario.id);
assert.equal(PRACTICE_DESTINATIONS['cli-svi-followup'].scenarioId,sequel.id);
assert.equal(getLesson('l2-svi').blocks.find(b=>b.practiceLink)?.practiceLink,'cli-svi-followup');
const ui=readFileSync('src/cli-lab/CliLabShell.tsx','utf8');
assert.match(ui,/ciscoAccessSviFollowupScenario/);
assert.match(ui,/scenario\.nextScenarioId/);
assert.match(ui,/completed && \(/);

// First exercise remains intact; the follow-up starts with the same successful VLAN/access configuration.
const s=sequel.initialState.devices.sw1;
assert.equal(s.vlans[10].name,'Users');
assert.equal(s.interfaces['FastEthernet0/1'].switchport.mode,'access');
assert.equal(s.interfaces['FastEthernet0/1'].switchport.accessVlan,10);
assert.equal(s.interfaces['FastEthernet0/1'].adminUp,true);
const lab=new LabEngine(ciscoIosProfile,ciscoIosCommands,structuredClone(sequel.initialState));
function command(line){const r=lab.execute(line);assert.equal(r.error,undefined,line+': '+r.output);return r.output;}
assert.equal(lab.checkGoals(sequel.goals).allPassed,false);
for(const line of ['enable','configure terminal','interface vlan 10','ip address 192.168.10.2 255.255.255.0','no shutdown','end']) command(line);
assert.equal(lab.checkGoals(sequel.steps[0].accept).allPassed,true);
assert.equal(lab.checkGoals(sequel.goals).allPassed,false,'save is still required');
const status=command('show ip interface brief');
assert.match(status,/Vlan10\s+192\.168\.10\.2/);
assert.match(status,/Vlan10[^\n]*down\s+down/);
assert.match(command('show running-config'),/interface Vlan10[\s\S]*ip address 192\.168\.10\.2 255\.255\.255\.0/);
command('copy running-config startup-config');
assert.equal(lab.checkGoals(sequel.goals).allPassed,true);
command('configure terminal');
command('interface vlan 10');
command('shutdown');
assert.equal(lab.checkGoals(sequel.goals).allPassed,false);
command('no shutdown');
command('end');
assert.equal(lab.checkGoals(sequel.goals).allPassed,true);
console.log('PASS access VLAN -> SVI guided progression, commands, SVI down/down without link, saved state and regression');
