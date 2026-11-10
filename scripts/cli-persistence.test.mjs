#!/usr/bin/env node
import assert from 'node:assert/strict';
import { build } from 'esbuild';

const compiled = await build({
  stdin: {
    contents: `export { LabEngine } from './src/cli-lab/engine/LabEngine.ts';
export { ciscoTwoSwitchVlanScenario } from './src/cli-lab/scenarios/cisco-two-switch-vlan.ts';
export { ciscoIosCommands } from './src/cli-lab/vendors/cisco-ios/commands.ts';
export { ciscoIosProfile } from './src/cli-lab/vendors/cisco-ios/profile.ts';`,
    resolveDir: process.cwd(), sourcefile: 'config-save-entry.ts', loader: 'ts',
  },
  bundle: true, platform: 'node', format: 'esm', write: false, logLevel: 'silent',
});
const module = await import('data:text/javascript;base64,' + Buffer.from(compiled.outputFiles[0].contents).toString('base64'));
const { LabEngine, ciscoTwoSwitchVlanScenario, ciscoIosCommands, ciscoIosProfile } = module;
const make = () => new LabEngine(ciscoIosProfile, ciscoIosCommands, structuredClone(ciscoTwoSwitchVlanScenario.initialState));
const engine = make();
const cmd = (line) => {
  const result = engine.execute(line);
  assert.equal(result.error, undefined, line + ': ' + result.output);
  return result.output;
};
const configure = (hostname) => {
  cmd('enable');
  cmd('configure terminal');
  cmd('hostname ' + hostname);
  cmd('end');
};
assert.equal(engine.execute('write memory').error, true, 'save requires enable');
configure('TEST-SW1');
assert.equal(engine.getState().devices.sw1.hostname, 'TEST-SW1');
assert.equal(engine.getState().devices.sw1.startupConfig.hostname, 'SW1', 'not autosaved');
assert.match(cmd('show startup-config'), /hostname SW1/);
assert.match(cmd('reload'), /Unsaved changes were discarded/);
assert.equal(engine.getPrompt(), 'SW1>', 'reload restores user exec mode');
assert.equal(engine.getState().devices.sw1.hostname, 'SW1', 'unsaved hostname lost');
configure('PERSISTED-SW1');
assert.match(cmd('copy running-config startup-config'), /\[OK\]/);
assert.match(cmd('show startup-config'), /hostname PERSISTED-SW1/);
cmd('reload');
assert.equal(engine.getState().devices.sw1.hostname, 'PERSISTED-SW1', 'saved hostname survives reload');
cmd('enable');
cmd('configure terminal');
cmd('hostname UNSAVED-SW1');
cmd('end');
cmd('reload');
assert.equal(engine.getState().devices.sw1.hostname, 'PERSISTED-SW1', 'post-save change lost');
cmd('enable');
cmd('write memory');
assert.equal(engine.selectDevice('sw2'), true);
configure('SW2-CHANGED');
assert.equal(engine.getState().devices.sw2.startupConfig.hostname, 'SW2', 'SW2 independently unsaved');
assert.match(cmd('wr mem'), /\[OK\]/);
cmd('reload');
assert.equal(engine.getState().devices.sw2.hostname, 'SW2-CHANGED');
engine.selectDevice('sw1');
assert.equal(engine.getState().devices.sw1.hostname, 'PERSISTED-SW1', 'SW2 operations do not touch SW1');
engine.reset(structuredClone(ciscoTwoSwitchVlanScenario.initialState));
assert.equal(engine.getState().devices.sw1.hostname, 'SW1', 'Reset returns lab to initial snapshot');
assert.equal(engine.getState().devices.sw2.hostname, 'SW2', 'Reset clears SW2 snapshot');
console.log('PASS: IOS save/reload/startup per-device persistence and reset');
