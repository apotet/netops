#!/usr/bin/env node
/**
 * Regression for F1 (P1): CLI Lab completion status.
 *
 * Success (completed / green banner) is shown only when evaluateGoals(...).allPassed === true.
 * In Learn the final step must not force completed=true without the overall goals check.
 * In Task/Drill (and after Learn is finished) any later command that violates goals
 * immediately clears the status; restoring the goals shows it again.
 * Step-by-step Learn progression and the ability to continue after an error are preserved.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';

const compiled = await build({
  stdin: {
    contents: `export { LabEngine } from './src/cli-lab/engine/LabEngine.ts';
export { evaluateGoals } from './src/cli-lab/engine/GoalEvaluator.ts';
export { shouldShowCompletion } from './src/cli-lab/engine/completionStatus.ts';
export { ciscoIosCommands } from './src/cli-lab/vendors/cisco-ios/commands.ts';
export { ciscoIosProfile } from './src/cli-lab/vendors/cisco-ios/profile.ts';
export { ciscoIosModesScenario } from './src/cli-lab/scenarios/cisco-ios-modes.ts';
export { ciscoVlanAccessScenario } from './src/cli-lab/scenarios/cisco-vlan-access.ts';`,
    resolveDir: process.cwd(),
    sourcefile: 'cli-completion-entry.ts',
    loader: 'ts',
  },
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false,
  logLevel: 'silent',
});
const mod = await import('data:text/javascript;base64,' + Buffer.from(compiled.outputFiles[0].contents).toString('base64'));
const { LabEngine, evaluateGoals, shouldShowCompletion, ciscoIosProfile, ciscoIosCommands, ciscoIosModesScenario, ciscoVlanAccessScenario } = mod;

// The test imports the production completion gate rather than mirroring it.
for (const file of ['src/cli-lab/CliLabShell.tsx','src/cli-lab/MockCliLabShell.tsx']) {
  const source = readFileSync(file, 'utf8');
  assert.match(source, /import \{ shouldShowCompletion \} from '\.\/engine\/completionStatus'/,
    file + ': UI must import the tested function');
  assert.equal((source.match(/shouldShowCompletion\(labMode, stepIndexRef\.current, steps\.length,/g) ?? []).length, 2,
    file + ': both Check button and command submission must use the same gate');
  assert.doesNotMatch(source, /setCompleted\(true\)/, file + ': unconditional success prohibited');
}
function runSequence(scenario, commands) {
  const engine = new LabEngine(ciscoIosProfile, ciscoIosCommands, structuredClone(scenario.initialState));
  const results = [];
  for (const cmd of commands) {
    const r = engine.execute(cmd);
    const goals = evaluateGoals(engine.getState(), scenario.goals);
    results.push({ cmd, error: r.error, allPassed: goals.allPassed, state: engine.getState() });
  }
  return { engine, results };
}

// --- Learn: final step must not complete without overall allPassed ---
{
  const scenario = ciscoIosModesScenario;
  const steps = scenario.steps;
  // Complete all steps correctly
  const okCmds = ['enable', 'conf t', 'interface FastEthernet0/1', 'exit', 'hostname NETOPS', 'end', 'copy running-config startup-config'];
  const { engine } = runSequence(scenario, okCmds);
  const final = evaluateGoals(engine.getState(), scenario.goals);
  assert.equal(final.allPassed, true, 'full correct sequence passes goals');
  // Simulate Learn finished (stepIndex >= length)
  assert.equal(shouldShowCompletion('learn', steps.length, steps.length, final.allPassed), true);

  // Last step accept can pass while overall goals fail (e.g. hostname wrong, but we force saved somehow – use a partial)
  // After correct hostname but before save, overall fails
  const partial = runSequence(scenario, okCmds.slice(0, 6)); // up to end, not saved
  const mid = evaluateGoals(partial.engine.getState(), scenario.goals);
  assert.equal(mid.allPassed, false);
  // Even if we pretend the last step was advanced, completed must stay false
  assert.equal(shouldShowCompletion('learn', steps.length, steps.length, mid.allPassed), false, 'Learn does not show success without allPassed');
}

// --- Task / Drill: green status clears on violation and returns on restore ---
{
  const scenario = ciscoIosModesScenario;
  const engine = new LabEngine(ciscoIosProfile, ciscoIosCommands, structuredClone(scenario.initialState));
  const send = (cmd) => {
    const r = engine.execute(cmd);
    assert.equal(r.error, undefined, cmd + ': ' + (r.output || ''));
    return evaluateGoals(engine.getState(), scenario.goals);
  };

  // Reach success
  ['enable', 'conf t', 'hostname NETOPS', 'end', 'copy running-config startup-config'].forEach(send);
  let g = evaluateGoals(engine.getState(), scenario.goals);
  assert.equal(g.allPassed, true);
  assert.equal(shouldShowCompletion('task', 0, 0, g.allPassed), true);
  assert.equal(shouldShowCompletion('drill', 0, 0, g.allPassed), true);

  // Violate: change hostname back
  send('conf t');
  send('hostname Switch');
  send('end');
  g = evaluateGoals(engine.getState(), scenario.goals);
  assert.equal(g.allPassed, false, 'hostname change breaks goals');
  assert.equal(shouldShowCompletion('task', 0, 0, g.allPassed), false, 'Task clears completion immediately');
  assert.equal(shouldShowCompletion('drill', 0, 0, g.allPassed), false, 'Drill clears completion immediately');

  // Restore
  send('conf t');
  send('hostname NETOPS');
  send('end');
  send('copy running-config startup-config');
  g = evaluateGoals(engine.getState(), scenario.goals);
  assert.equal(g.allPassed, true, 'goals restored');
  assert.equal(shouldShowCompletion('task', 0, 0, g.allPassed), true, 'success reappears after restore');
}

// --- Learn step-by-step still advances only on step accept; continue after error ---
{
  const scenario = ciscoIosModesScenario;
  const engine = new LabEngine(ciscoIosProfile, ciscoIosCommands, structuredClone(scenario.initialState));
  // Wrong command does not advance (accept not met)
  engine.execute('show version');
  const step0 = evaluateGoals(engine.getState(), scenario.steps[0].accept);
  assert.equal(step0.allPassed, false);
  // Correct advances
  engine.execute('enable');
  const step0ok = evaluateGoals(engine.getState(), scenario.steps[0].accept);
  assert.equal(step0ok.allPassed, true);
  // Overall still false
  assert.equal(evaluateGoals(engine.getState(), scenario.goals).allPassed, false);
  // Can continue after the error
  engine.execute('conf t');
  assert.equal(evaluateGoals(engine.getState(), scenario.steps[1].accept).allPassed, true);
}

// --- Another scenario: VLAN access, same rules ---
{
  const scenario = ciscoVlanAccessScenario;
  const engine = new LabEngine(ciscoIosProfile, ciscoIosCommands, structuredClone(scenario.initialState));
  const send = (cmd) => engine.execute(cmd);
  // Typical happy path (adjust if commands differ; we only care about goal evaluation)
  // We rely on the engine + goals being the source of truth
  const before = evaluateGoals(engine.getState(), scenario.goals);
  assert.equal(before.allPassed, false);
  assert.equal(shouldShowCompletion('task', 0, 0, before.allPassed), false);
  assert.equal(shouldShowCompletion('learn', 0, (scenario.steps || []).length, before.allPassed), false);
}

console.log('PASS: F1 completion status – success only on allPassed, clears on violation, restores, Learn steps intact');
