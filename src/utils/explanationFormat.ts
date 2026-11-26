export function explanationText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const text = value.trim();
  return !text || /RESTORED_FULL_CONTENT|UPDATED_CONTENT|FULL_FILE_CONTENT_WILL_BE_INCLUDED|^(?:TODO|TBD|undefined|null)$/i.test(text) ? null : text;
}

export type ExplanationBlock =
  | { kind: 'paragraph' | 'code'; text: string }
  | { kind: 'list'; ordered: boolean; start: number; items: string[] };

const command = /^(?:\$ |(?:[\w.-]+(?:\([\w-]+\))?)[#>]\s|(?:sudo\s+)?(?:ss|netstat|ping6?|traceroute6?|tracert|ethtool|dig|ipconfig|tcpdump|nslookup|curl|show|display|arp)\s+(?:-\S+|[a-z0-9][a-z0-9.:/-]*)(?:\s|$)|(?:sudo\s+)?ip\s+(?:-\S+\s+)?(?:addr(?:ess)?|neigh|route|rule|link)\b)/;
const terminalOutput = /^(?:(?:LISTEN|UNCONN|ESTAB|ESTABLISHED|SYN-SENT|TIME-WAIT)[ \t]+\d|(?:State|Netid|Proto)\s+.*(?:Recv-Q|Local Address)|(?:default|[\da-f.:]+\/\d{1,3})\s+(?:via|dev)\s|\d+\s+from\s+(?:all|[\da-f.:/]+)\s+lookup\s|(?:PING|Reply from|Ответ от)\s|\d+ bytes from\s)/i;

const namedCommand = /^(Пример(?: команды)?|Команда|Проверка):\s+(.+)$/iu;
const naturalLanguage = /[А-Яа-яЁё]/u;

export function formatExplanation(text: string): ExplanationBlock[] {
  const blocks: ExplanationBlock[] = [];
  let pending: string[] = [];
  let fence: string | undefined;
  let fencedLines: string[] = [];
  let adjacent = false;
  const flushFence = () => {
    if (fencedLines.some(line => line.trim())) blocks.push({ kind: 'code', text: fencedLines.join('\n') });
    fencedLines = [];
  };
  const flush = () => {
    if (pending.length) blocks.push({ kind: 'paragraph', text: pending.join('\n') });
    pending = [];
  };
  for (const line of text.replace(/\r\n?/g, '\n').split('\n')) {
    const trimmed = line.trim();
    if (fence) {
      if (trimmed === fence) {
        flushFence();
        fence = undefined;
      } else {
        fencedLines.push(line);
      }
      continue;
    }
    const opening = trimmed.match(/^(`{3,}|~{3,})[\w+-]*$/);
    if (opening) {
      flush();
      fence = opening[1];
      adjacent = false;
      continue;
    }
    if (!trimmed) {
      flush();
      adjacent = false;
      continue;
    }
    const item = trimmed.match(/^(?:([-*•])|(\d+)[.)])\s+(.+)$/);
    if (item) {
      flush();
      const ordered = item[2] !== undefined;
      const previous = blocks.at(-1);
      const start = ordered ? Number(item[2]) : 1;
      if (adjacent && previous?.kind === 'list' && previous.ordered === ordered &&
          (!ordered || start === previous.start + previous.items.length)) {
        previous.items.push(item[3]);
      } else {
        blocks.push({ kind: 'list', ordered, start, items: [item[3]] });
      }
      adjacent = true;
      continue;
    }
    const previous = blocks.at(-1);
    if (adjacent && previous?.kind === 'list' && /^ {2,3}\S/.test(line)) {
      previous.items[previous.items.length - 1] += '\n' + trimmed;
      continue;
    }
    const example = trimmed.match(namedCommand);
    if (example && command.test(example[2]) && !naturalLanguage.test(example[2]) && !example[2].includes(',')) {
      flush();
      blocks.push({ kind: 'paragraph', text: example[1] + ':' }, { kind: 'code', text: example[2] });
      adjacent = true;
      continue;
    }
    if (/^(?: {4}|\t)/.test(line) || command.test(trimmed) && !naturalLanguage.test(trimmed) || terminalOutput.test(trimmed)) {
      flush();
      if (adjacent && previous?.kind === 'code') previous.text += '\n' + line;
      else blocks.push({ kind: 'code', text: line });
      adjacent = true;
      continue;
    }
    adjacent = false;
    pending.push(trimmed);
  }
  flush();
  flushFence();
  return blocks;
}

export function formatInlineExplanation(text: string): { text: string; code: boolean }[] {
  return text.split(/(`[^`\n]+`|(?:^|(?<=[\s(,]))--?[a-zA-Z][a-zA-Z\d-]*(?:=[^\s),.;:]+)?(?=$|[\s),.;:]))/gu)
    .filter(Boolean)
    .map(part => ({
      text: part.startsWith('`') && part.endsWith('`') ? part.slice(1, -1) : part,
      code: /^`[^`\n]+`$|^--?[a-zA-Z][a-zA-Z\d-]*(?:=[^\s),.;:]+)?$/u.test(part),
    }));
}
