import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createServer } from 'vite';
import { bundleEntry } from './load-bank.mjs';

const config = await bundleEntry('src/config/sharedAssets.ts', 'shared-assets-config.mjs');
const { ALL_QUESTIONS, resolveImageUrl } = await bundleEntry('src/data/questionsData.ts', 'shared-assets-bank.mjs');
const { LEVEL_NOTES } = await bundleEntry('src/data/levelNotes.ts', 'shared-assets-notes.mjs');
const revision = '1c52fa81222167dc4377fe4788de86f3e36ad444';
const base = `https://raw.githubusercontent.com/apotet/osi-tcpip-exam-public/${revision}`;
assert.equal(config.SHARED_ASSETS_REVISION, revision);
assert.equal(config.SHARED_ASSETS_BASE_URL, base);

const photos = ALL_QUESTIONS.filter(q => q.image);
const paths = [...new Set(photos.map(q => q.image))];
assert.equal(photos.length, 194);
assert.equal(paths.length, 89);
const retired = JSON.parse(readFileSync('src/data/retiredPvcPhotoQuestion.json', 'utf8'));
assert.ok(!paths.includes(retired.image), 'retired photo not in current selection');
assert.equal(resolveImageUrl(retired.image), `${base}/${retired.image}`, 'historical review retains pinned photo');
for (const path of paths) {
  assert.equal(resolveImageUrl(path), `${base}/${path}`);
  assert.equal(resolveImageUrl(`./${path}`), `${base}/${path}`);
  assert.equal(resolveImageUrl(`/${path}`), `${base}/${path}`);
}
assert.equal(resolveImageUrl(), '');
assert.equal(resolveImageUrl(''), '');
for (const url of ['https://example.test/photo.png', 'http://example.test/photo.jpg']) {
  assert.equal(resolveImageUrl(url), url, 'external resources retain their original origin');
}
assert.equal(config.SHARED_ASSETS_CREDITS_URL, `${base}/assets/photos/credits.json`);
assert.equal(config.SHARED_ASSETS_CREDITS_SOURCE_URL,
  `https://github.com/apotet/osi-tcpip-exam-public/blob/${revision}/assets/photos/credits.json`);
assert.equal(LEVEL_NOTES.length, 7);
for (const note of LEVEL_NOTES) {
  assert.equal(note.cheatSvg, `${base}/assets/cheatsheets/l${note.level}.svg`);
  assert.equal(note.cheatWebp, `${base}/assets/cheatsheets/l${note.level}.webp`);
}

// Exercise the actual Vite HTML transform for both entry templates.
const server = await createServer({ server: { middlewareMode: true, hmr: false, watch: null } });
try {
  for (const file of ['index.html', 'index.dev.html']) {
    const html = await server.transformIndexHtml(`/${file}`, readFileSync(file, 'utf8'));
    assert.ok(html.includes(`<meta property="og:image" content="${config.SHARED_ASSETS_OG_IMAGE_URL}" />`));
    assert.ok(!html.includes('__SHARED_ASSETS_OG_IMAGE_URL__'));
    assert.ok(!html.includes('/main/assets/'));
  }
} finally {
  await server.close();
}

function checkSources(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) checkSources(path);
    else if (/\.(?:ts|tsx)$/.test(path)) {
      assert.ok(!/osi-tcpip-exam-public\/(?:blob\/)?main\/assets\//.test(readFileSync(path, 'utf8')),
        `mutable shared resource URL in ${path}`);
    }
  }
}
checkSources('src');
console.log('PASS: 194 active photo questions / 89 URLs plus the pinned historical photo, external URLs, credits, 14 cheatsheets, both Vite HTML transforms, no mutable source URLs');
