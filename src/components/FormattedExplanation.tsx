import { Fragment } from 'react';
import { formatExplanation, formatInlineExplanation } from '../utils/explanationFormat';
import { GlossaryText } from './GlossaryText';

const codeClass = 'max-w-full overflow-x-auto whitespace-pre rounded-lg bg-slate-100 p-3 font-mono text-xs leading-relaxed dark:bg-slate-900';

const POE_EQUATION_SEGMENTS = /(ΔU = I × R|Pпотерь = I² × R)/g;
const IS_POE_EQUATION = /^(?:ΔU = I × R|Pпотерь = I² × R)$/;

function InlineExplanation({ text, plainGlossaryTerms, glossaryScope }: { text: string; plainGlossaryTerms?: string[]; glossaryScope?: "poe" | "ipv6" | "http" }) {
  return formatInlineExplanation(text).map((part, index) => {
    if (part.code) return <code key={index} className="rounded bg-slate-100 px-1 font-mono text-[.92em] dark:bg-slate-900">{part.text}</code>;
    // I and R are generic symbols. Explain them only inside these two PoE formulas,
    // never in unrelated prose, commands, or other lessons.
    const segments = glossaryScope === 'poe' ? part.text.split(POE_EQUATION_SEGMENTS) : [part.text];
    return <Fragment key={index}>{segments.map((segment, piece) => (
      <GlossaryText key={piece} plainTerms={plainGlossaryTerms}
        scope={glossaryScope === 'poe' && IS_POE_EQUATION.test(segment) ? 'poe-formula' : glossaryScope}>
        {segment}
      </GlossaryText>
    ))}</Fragment>;
  });
}

export function FormattedExplanation({ text, command = false, plainGlossaryTerms, glossaryScope }: { text: string; command?: boolean; plainGlossaryTerms?: string[]; glossaryScope?: "poe" | "ipv6" | "http" }) {
  if (command) return <pre className={codeClass}><code>{text}</code></pre>;
  return <div className="min-w-0 max-w-full space-y-2 wrap-anywhere">
    {formatExplanation(text).map((block, index) => {
      if (block.kind === 'code') return <pre key={index} className={codeClass}><code>{block.text}</code></pre>;
      if (block.kind === 'list') {
        const items = block.items.map((item, itemIndex) => <li key={itemIndex} className="whitespace-pre-line"><InlineExplanation text={item} plainGlossaryTerms={plainGlossaryTerms} glossaryScope={glossaryScope} /></li>);
        return block.ordered
          ? <ol key={index} start={block.start} className="list-decimal space-y-1 pl-6">{items}</ol>
          : <ul key={index} className="list-disc space-y-1 pl-6">{items}</ul>;
      }
      return <p key={index} className="whitespace-pre-line"><InlineExplanation text={block.text} plainGlossaryTerms={plainGlossaryTerms} glossaryScope={glossaryScope} /></p>;
    })}
  </div>;
}
