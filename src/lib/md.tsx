import type { ReactNode } from "react";

// Renderizador de Markdown mínimo e seguro (sem dangerouslySetInnerHTML): títulos, listas, checkboxes, citações, código e ênfase.
function inline(s: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*|\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g;
  let last = 0, i = 0, m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index));
    const t = m[0];
    if (t.startsWith("**")) out.push(<strong key={`${key}b${i}`} className="font-semibold text-white">{t.slice(2, -2)}</strong>);
    else if (t.startsWith("`")) out.push(<code key={`${key}c${i}`} className="mono rounded bg-surface-3 px-1 py-px text-[0.85em] text-primary-soft">{t.slice(1, -1)}</code>);
    else if (t.startsWith("[")) { const mm = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/.exec(t)!; out.push(<a key={`${key}a${i}`} href={mm[2]} target="_blank" rel="noreferrer" className="text-primary-soft underline underline-offset-2">{mm[1]}</a>); }
    else out.push(<em key={`${key}e${i}`}>{t.slice(1, -1)}</em>);
    last = m.index + t.length; i++;
  }
  if (last < s.length) out.push(s.slice(last));
  return out;
}

export function renderMd(body: string, onToggle?: (line: number) => void): ReactNode[] {
  const lines = body.split("\n");
  const out: ReactNode[] = [];
  let code: string[] | null = null;
  lines.forEach((ln, i) => {
    if (ln.trim().startsWith("```")) {
      if (code) { out.push(<pre key={i} className="mono my-2 overflow-x-auto rounded-lg bg-surface-lowest p-3 text-xs">{code.join("\n")}</pre>); code = null; } else code = [];
      return;
    }
    if (code) { code.push(ln); return; }
    let m: RegExpMatchArray | null;
    if ((m = ln.match(/^(#{1,3})\s+(.*)$/))) {
      const cls = m[1].length === 1 ? "mt-1 mb-2 text-2xl font-bold tracking-tight" : m[1].length === 2 ? "mt-4 mb-1.5 text-lg font-semibold tracking-tight" : "mt-3 mb-1 text-base font-semibold";
      out.push(<div key={i} role="heading" aria-level={m[1].length} className={cls}>{inline(m[2], `h${i}`)}</div>);
    } else if ((m = ln.match(/^\s*[-*]\s+\[( |x|X)\]\s+(.*)$/))) {
      const done = m[1].toLowerCase() === "x";
      out.push(
        <div key={i} className="flex items-start gap-2.5 py-1">
          <button onClick={() => onToggle?.(i)} role="checkbox" aria-checked={done} aria-label={m![2]} className={`mt-0.5 grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[4px] border ${done ? "border-emerald bg-emerald" : "border-stroke bg-surface-1"}`}>{done && <span className="text-[11px] font-bold leading-none text-white">✓</span>}</button>
          <span className={done ? "text-ink-mute line-through" : ""}>{inline(m[2], `t${i}`)}</span>
        </div>,
      );
    } else if ((m = ln.match(/^\s*[-*]\s+(.*)$/))) {
      out.push(<div key={i} className="flex gap-2.5 py-0.5"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary" /><span>{inline(m[1], `l${i}`)}</span></div>);
    } else if ((m = ln.match(/^>\s?(.*)$/))) {
      out.push(<blockquote key={i} className="my-1 border-l-2 border-primary/60 pl-3 text-ink-dim">{inline(m[1], `q${i}`)}</blockquote>);
    } else if (ln.trim() === "") {
      out.push(<div key={i} className="h-2" />);
    } else out.push(<p key={i} className="py-0.5 leading-relaxed">{inline(ln, `p${i}`)}</p>);
  });
  return out;
}

export function checklistProgress(body: string) {
  const all = body.match(/^\s*[-*]\s+\[( |x|X)\]/gm) ?? [];
  const done = all.filter((l) => /\[(x|X)\]/.test(l)).length;
  return { done, total: all.length };
}

export function toggleLine(body: string, line: number) {
  const lines = body.split("\n");
  lines[line] = lines[line].replace(/\[( |x|X)\]/, (_, c) => (c === " " ? "[x]" : "[ ]"));
  return lines.join("\n");
}
