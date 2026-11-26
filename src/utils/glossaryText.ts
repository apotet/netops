import { GLOSSARY_TOOLTIPS } from '../data/glossary';

const terms = Object.keys(GLOSSARY_TOOLTIPS).sort((a, b) => b.length - a.length);
const canonical = new Map(terms.map(term => [term.toLowerCase(), term]));
// Generic English fields (Used, Class, Type...) mean something else in non-PoE lessons.
// Render their PoE-specific tooltips only when an explicit PoE lesson scope is set.
const POE_ONLY_TERMS = new Set(["Requested Class","Received Class","Unloaded Voltage","TruePower","TruePower Power","TruePower Voltage","PSE Type 1/2","Positive","Negative","DC/DC","Available","Used","Remaining","Allocated","Utilized","Measured","Class","PoE+","LLDP Power-via-MDI","Alt A/B","Переключение A/B","A/B","detection","classification","link up","полярность","ток пуска","read-only","Type"]);
const POE_FORMULA_ONLY_TERMS = new Set(["ΔU", "I", "R", "I²", "Pпотерь"]);
const IPV6_ONLY_TERMS = new Set(["A=1", "A=0", "L=1", "L=0", "A/L"]);

const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Keep existing slash-separated terms such as Wi-Fi k/v/r unchanged; only
// suppress a standalone FTP tooltip when it is a suffix of a slash code.
const pattern = new RegExp(`(?<![\\p{L}\\p{N}_])(${terms.map(escape).join('|')})(?![\\p{L}\\p{N}_])`, 'giu');
// A–A / A–B (T568 wiring) are pair labels, not DNS A records.
// Also accept ASCII hyphen, em dash and optional spacing; preserve standalone DNS A.
const wiringPairs = /(?<![\p{L}\p{N}_])[AB]\s*[-–—]\s*[AB](?![\p{L}\p{N}_])/gu;

export function splitGlossaryText(text: string, scope?: "poe" | "poe-formula" | "ipv6" | "http"): { text: string; term?: string }[] {
  const parts: { text: string; term?: string }[] = [];
  let offset = 0;
  const wiringRanges = [...text.matchAll(wiringPairs)].map(match => [match.index, match.index + match[0].length] as const);
  for (const match of text.matchAll(pattern)) {
    let term = canonical.get(match[0].toLowerCase());
    // HTTP prose must not borrow meanings from DNS, DHCP or BGP.
    if (scope === "http" && term && ["a", "update", "request", "trusted", "keepalive"].includes(term.toLowerCase())) continue;
    // In an IPv6 SLAAC lesson, standalone A is the RA Prefix Information
    // autonomous flag. A genuine DNS A record keeps the DNS meaning.
    if (scope === "ipv6" && term === "A" &&
        !/(?:DNS|DNS-запись|запис[ьи])\s*$/iu.test(text.slice(Math.max(0, match.index - 30), match.index))) {
      term = "A flag";
    }
    // Case labels and physical connectors are not DNS or transport-layer terms.
    if (scope === "poe" || scope === "poe-formula") {
      if (term === "A" && /Кейс\s*$/iu.test(text.slice(0, match.index))) continue;
      if (term?.toLowerCase() === "порт" || term?.toLowerCase() === "port") continue;
    }
    if (term && IPV6_ONLY_TERMS.has(term) && scope !== "ipv6") continue;
    if (term && POE_ONLY_TERMS.has(term) && scope !== "poe" && scope !== "poe-formula") continue;
    if (term && POE_FORMULA_ONLY_TERMS.has(term) && scope !== "poe-formula") continue;
    if (match[0] === 'A' && wiringRanges.some(([start, end]) => match.index >= start && match.index < end)) continue;
    // The "A" in A/B (PoE alternatives) is NOT DNS record A.
    // Without PoE context, leave the entire A/B token plain rather than producing a wrong DNS popup.
    if (term === 'A' && text.slice(match.index, match.index + 3).toUpperCase() === 'A/B') continue;
    // An unregistered X/FTP is cabling notation, not file-transfer FTP.
    // Registered S/FTP and U/FTP match as whole terms via longest-first ordering.
    if (match[0].toUpperCase() === 'FTP' && match.index > 0 && text[match.index - 1] === '/') continue;
    if (match.index > offset) parts.push({ text: text.slice(offset, match.index) });
    parts.push({ text: match[0], term });
    offset = match.index + match[0].length;
  }
  if (offset < text.length) parts.push({ text: text.slice(offset) });
  return parts;
}
