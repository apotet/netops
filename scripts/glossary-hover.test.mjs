import assert from 'node:assert/strict';
import { build } from 'esbuild';
await build({ stdin: { contents: "export * from './src/data/glossary'; export * from './src/utils/glossaryText';", resolveDir: process.cwd() }, bundle: true, platform: 'node', format: 'esm', outfile: 'scripts/.cache/glossary-hover.mjs', logLevel: 'silent' });
const { GLOSSARY, GLOSSARY_TOOLTIPS, GLOSSARY_ABBREVIATIONS, splitGlossaryText } = await import('./.cache/glossary-hover.mjs');
for (const [term, entry] of Object.entries(GLOSSARY_TOOLTIPS)) {
  assert.ok(GLOSSARY[term]?.description.trim(), term);
  for (const field of ['english', 'russian', 'summary']) assert.ok(entry[field].trim(), `${term}: ${field}`);
  assert.ok(entry.summary.length < 300, `${term}: summary too long`);
}
for (const term of ['TC', 'DNS', 'UDP', 'TCP', 'DHCP', 'SNI', 'HSTS', 'SAN', 'ACK', 'TTL', 'MAC', 'VLAN', 'ARP', 'NAT', 'OSPF', 'STP', 'OTDR', 'OLTS', 'VFL']) assert.ok(GLOSSARY_ABBREVIATIONS.includes(term), term);
const source = 'TCP/IP, DNSSEC, dns, Source MAC, OTDR. XDNSX неизвестно';
const parts = splitGlossaryText(source);
assert.equal(parts.map(part => part.text).join(''), source);
assert.deepEqual(parts.filter(part => part.term).map(part => part.term), ['TCP/IP', 'DNSSEC', 'DNS', 'Source MAC', 'OTDR']);
const flags = 'TC=1, (TC=0); TC/UDP; tc=1. XTCX TC0 ATC TC_flag';
const flagParts = splitGlossaryText(flags);
assert.equal(flagParts.map(part => part.text).join(''), flags);
assert.deepEqual(flagParts.filter(part => part.term).map(part => part.term), ['TC', 'TC', 'TC', 'UDP', 'TC']);
const compounds = ['PHY-to-PHY', 'store-and-forward', 'cut-through', 'half-duplex', 'full-duplex', 'media converter', 'repeater'];
for (const term of compounds) assert.ok(GLOSSARY_TOOLTIPS[term], term);
const compoundText = '(PHY-to-PHY), STORE-AND-FORWARD; cut-through/half-duplex; full-duplex, media converter, repeater.';
const compoundParts = splitGlossaryText(compoundText);
assert.equal(compoundParts.map(part => part.text).join(''), compoundText);
assert.deepEqual(compoundParts.filter(part => part.term).map(part => part.term), compounds);
assert.ok(!splitGlossaryText('XPHY-to-PHYY store-and-forwarding').some(part => compounds.includes(part.term)));
assert.deepEqual(splitGlossaryText('неизвестно'), [{ text: 'неизвестно' }]);
console.log(`PASS: ${GLOSSARY_ABBREVIATIONS.length} abbreviations, ${Object.keys(GLOSSARY_TOOLTIPS).length} complete tooltips; boundaries and longest matches`);
