#!/usr/bin/env node
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const compiled = await build({
  stdin: {
    contents: `export { LabEngine } from './src/cli-lab/engine/LabEngine.ts';
export { ciscoIosCommands } from './src/cli-lab/vendors/cisco-ios/commands.ts';
export { ciscoIosProfile } from './src/cli-lab/vendors/cisco-ios/profile.ts';
export { ciscoIosModesScenario } from './src/cli-lab/scenarios/cisco-ios-modes.ts';
export { PRACTICE_DESTINATIONS } from './src/data/practiceLinks.ts';
export { LESSON_CLI_IOS_MODES } from './src/data/lessons/cli-ios-modes.ts';`,
    resolveDir: process.cwd(),
    sourcefile: 'cli-modes-lab-entry.ts',
    loader: 'ts',
  },
  bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent',
});
const mod = await import('data:text/javascript;base64,' + Buffer.from(compiled.outputFiles[0].contents).toString('base64'));
const { ciscoIosModesScenario: scenario, PRACTICE_DESTINATIONS: destinations, LESSON_CLI_IOS_MODES: lesson } = mod;
const engine = new mod.LabEngine(mod.ciscoIosProfile, mod.ciscoIosCommands, structuredClone(scenario.initialState));
const send = cmd => {
  const r = engine.execute(cmd);
  assert.equal(r.error, undefined, cmd + ': ' + r.output);
  return r.output;
};

assert.equal(destinations['cli-modes'].scenarioId, scenario.id);
assert.equal(lesson.blocks.at(-1).practiceLink, 'cli-modes');
assert.equal(lesson.professional.blocks.at(-1).practiceLink, 'cli-modes');
assert.equal(scenario.steps.length, 7);
assert.deepEqual(scenario.modesAllowed, ['learn', 'drill', 'task']);
assert.equal(engine.getPrompt(), 'Switch>');
assert.equal(engine.checkGoals(scenario.goals).allPassed, false);

const commands = [
  'enable',
  'conf t',
  'interface FastEthernet0/1',
  'exit',
  'hostname NETOPS',
  'end',
  'copy running-config startup-config',
];
for (const [i, cmd] of commands.entries()) {
  send(cmd);
  assert.equal(engine.checkGoals(scenario.steps[i].accept).allPassed, true, 'step ' + (i + 1) + ': ' + cmd);
  if (i < commands.length - 1) assert.equal(engine.checkGoals(scenario.goals).allPassed, false, 'premature completion ' + i);
}
assert.equal(engine.getPrompt(), 'NETOPS#');
assert.equal(engine.checkGoals(scenario.goals).allPassed, true);
assert.equal(engine.getState().devices.sw1.startupConfig.hostname, 'NETOPS');
send('reload');
assert.equal(engine.getPrompt(), 'NETOPS>');
assert.equal(engine.getState().devices.sw1.startupConfig.hostname, 'NETOPS');

// Unsaved configuration must not survive reload.
const unsaved = new mod.LabEngine(mod.ciscoIosProfile, mod.ciscoIosCommands, structuredClone(scenario.initialState));
const change = cmd => { const r = unsaved.execute(cmd); assert.equal(r.error, undefined, cmd); };
change('enable'); change('configure terminal'); change('hostname UNSAVED'); change('end');
assert.equal(unsaved.checkGoals(scenario.goals).allPassed, false);
change('reload');
assert.equal(unsaved.getPrompt(), 'Switch>');

// Question-mark help and TAB never advance mode or save state.
const readonly = new mod.LabEngine(mod.ciscoIosProfile, mod.ciscoIosCommands, structuredClone(scenario.initialState));
const before = structuredClone(readonly.getState());
assert.ok(readonly.help('en?').includes('enable'));
assert.equal(readonly.complete('en').completed, 'enable ');
assert.deepEqual(readonly.getState(), before);

console.log('PASS: IOS modes lab 7 steps, goal ordering, save/reload, unsaved rollback, lesson link, readonly TAB/help');
