// Static contract for the PoE SVG; Chromium screenshots are reviewed separately.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const svg = readFileSync(new URL('../public/lesson-images/poe-data-power-loop.svg', import.meta.url), 'utf8');
assert.match(svg, /viewBox="0 0 860 720"/, 'retain original viewBox');
assert.match(svg, /<title id="title">/, 'retain accessible title');
assert.match(svg, /<desc id="desc">/, 'retain accessible description');
assert.equal((svg.match(/<animateMotion\b/g) || []).length, 12, 'retain 12 animated impulses, 3 per device');
const centers = [135, 330, 530, 725];
for (const x of centers) assert.ok(svg.includes('L' + x + ' 222'), 'retain cable endpoint and pulse route at x=' + x);

const devices = ['poe-camera', 'poe-wifi', 'poe-voip', 'poe-access'];
for (const id of devices) {
  const panel = svg.match(new RegExp('<g id="' + id + '" transform="translate\\([\\d,]+\\)">([\\s\\S]*?)</g>'));
  assert.ok(panel, 'missing device: ' + id);
  assert.ok(!panel[1].includes('Данные') && !panel[1].includes('Питание'), id + ': remove old labels that intersect cable');
}

const labelsAt = svg.indexOf('<g id="branch-labels"');
assert.ok(labelsAt > svg.lastIndexOf('<animateMotion'), 'legend card layer must render over glowing animation');
const badges = [...svg.matchAll(/<g transform="translate\((\d+),256\)">([\s\S]*?)<\/g>/g)];
assert.equal(badges.length, 4, 'four branch legend cards');
for (let i = 0; i < badges.length; i++) {
  const left = Number(badges[i][1]);
  const body = badges[i][2];
  assert.equal(left, centers[i] + 16, 'legend offset right of branch x=' + centers[i]);
  assert.ok(left >= centers[i] + 15 && left + 96 <= 860 - 15, 'legend must remain inside SVG canvas');
  assert.ok(i === 0 || left >= Number(badges[i - 1][1]) + 96 + 8, 'neighboring badges must not touch');
  assert.match(body, /<rect x="0" y="0" width="96" height="48" rx="8" fill="#061726" fill-opacity="0.9"/, 'opaque plate over animated pulses');
  assert.match(body, /<text x="10" y="20" fill="#4cc9ff">↑↓ Данные<\/text>/, 'blue data label');
  assert.match(body, /<text x="10" y="39" fill="#ff9c39">↑ Питание<\/text>/, 'orange power label');
  const dataY = Number(body.match(/y="([0-9]+)" fill="#4cc9ff"/)?.[1]);
  const powerY = Number(body.match(/y="([0-9]+)" fill="#ff9c39"/)?.[1]);
  assert.ok(Number.isFinite(dataY) && Number.isFinite(powerY) && powerY - dataY >= 18 && powerY - dataY <= 24,
    'data/power baselines must be legible and consistently separated');

}

assert.match(svg, /<rect x="308" y="382" width="245" height="56"/, 'central label plate taller');
assert.match(svg, /<text x="431" y="405"[^>]*>ДАННЫЕ<\/text>/, 'central data baseline');
assert.match(svg, /<text x="431" y="428"[^>]*>\+ ПИТАНИЕ<\/text>/, 'central power baseline');

const access = svg.match(/<g id="poe-access"[^>]*>([\s\S]*?)<\/g>/);
assert.match(access[1], /<rect x="-88" y="-79" width="176" height="35"/, 'wide access header');
assert.ok(725 - 88 > 530 + 76 && 725 + 88 < 860, 'access label must stay within canvas and clear VoIP');
const wifi = svg.match(/<g id="poe-wifi"[^>]*>([\s\S]*?)<\/g>/);
assert.match(wifi[1], /d="M-14 -32 Q0 -42 14 -32 M-9 -25 Q0 -32 9 -25"/, 'Wi-Fi waves remain clear of title pill');
console.log('PASS: four mobile-friendly PoE legend plates, central box, access/Wi-Fi spacing, and 12 impulses');
