/**
 * Bundle data-entry.ts / bank-entry.ts with esbuild and import real modules.
 */
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const cacheDir = join(root, 'scripts/.cache');

export async function bundleEntry(entryRel, outName) {
  mkdirSync(cacheDir, { recursive: true });
  const require = createRequire(import.meta.url);
  let esbuild;
  try {
    esbuild = require('esbuild');
  } catch (e) {
    throw new Error('esbuild not installed — run npm install first: ' + e.message);
  }
  const outfile = join(cacheDir, outName);
  const result = await esbuild.build({
    entryPoints: [join(root, entryRel)],
    bundle: true,
    platform: 'node',
    format: 'esm',
    outfile,
    write: true,
    loader: { '.json': 'json', '.ts': 'ts', '.tsx': 'ts' },
    logLevel: 'info',
  });
  if (result.errors?.length) {
    console.error(result.errors);
    throw new Error('esbuild failed');
  }
  if (!existsSync(outfile)) throw new Error('bundle missing: ' + outfile);
  return import(pathToFileURL(outfile).href + `?t=${Date.now()}`);
}

export async function loadBank() {
  return bundleEntry('scripts/data-entry.ts', 'data-bundle.mjs');
}

export async function loadBankWithExplanations() {
  return bundleEntry('scripts/bank-entry.ts', 'bank-bundle.mjs');
}

export function writeJson(rel, data) {
  const p = join(root, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
}

export function writeText(rel, text) {
  const p = join(root, rel);
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, text, 'utf8');
}
