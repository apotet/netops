import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Reconstruct the exact pre-change order and wording for frozen historical hash checks.
// These projections are test-only and never feed active question selection.
export const retiredPvcPhoto = JSON.parse(readFileSync(new URL('../src/data/retiredPvcPhotoQuestion.json', import.meta.url), 'utf8'));
export const previousCopperUtp = JSON.parse(readFileSync(new URL('../src/data/previousCopperUtpPhotoQuestion.json', import.meta.url), 'utf8'));
export const previousOpticalInspection = JSON.parse(readFileSync(new URL('../src/data/previousOpticalInspectionQuestion.json', import.meta.url), 'utf8'));
export const retiredPvcLevel = {
  status: 'ASSIGNED', auditAction: 'KEEP', learningLevel: 1, confidence: 'high',
  auditRationale: 'Распознать (L1 · Фото и практика): Поливинилхлорид (PVC)',
};
const position = 398;

export function bankBeforeOpticalWordingChange(questions) {
  const revised = questions.filter(q => q.id === previousOpticalInspection.id);
  assert.equal(revised.length, 1);
  assert.equal(revised[0].text, 'Какую проверку выполняют этим прибором перед подключением оптического патч-корда?');
  return questions.map(q => q.id === previousOpticalInspection.id ? { ...q, ...previousOpticalInspection } : q);
}
export function bankBeforeCopperPhotoChanges(currentQuestions) {
  const questions = bankBeforeOpticalWordingChange(currentQuestions);
  assert.ok(questions.every(q => q.id !== retiredPvcPhoto.id), 'retired question is not active');
  assert.equal(questions[position - 1]?.id, 'l1v2-a-mark-frequency');
  assert.equal(questions[position]?.id, 'l1v2-a-solid-view');
  const revised = questions.filter(q => q.id === previousCopperUtp.id);
  assert.equal(revised.length, 1);
  assert.equal(revised[0].text, 'Какое обозначение экранирования соответствует кабелю на этом срезе?');
  assert.deepEqual(revised[0].answers, ['F/UTP', 'S/FTP', 'F/FTP', 'U/UTP']);
  return [...questions.slice(0, position), structuredClone(retiredPvcPhoto), ...questions.slice(position)]
    .map(q => q.id === previousCopperUtp.id ? { ...q, ...previousCopperUtp } : q);
}
export function registryBeforePvcRetirement(registry) {
  assert.ok(!Object.hasOwn(registry, retiredPvcPhoto.id), 'retired ID is absent from the active registry');
  const rows = Object.entries(registry);
  assert.equal(rows[position - 1]?.[0], 'l1v2-a-mark-frequency');
  assert.equal(rows[position]?.[0], 'l1v2-a-solid-view');
  return Object.fromEntries([...rows.slice(0, position), [retiredPvcPhoto.id, retiredPvcLevel], ...rows.slice(position)]);
}
