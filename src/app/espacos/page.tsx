"use client";
import { ArrowLeft, ArrowRight, CheckSquare, Eye, FileText, KanbanSquare, List, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { TaskRow } from "@/components/Cards";
import { Bar, Empty, PageHeader } from "@/components/ui";
import { checklistProgress, renderMd, toggleLine } from "@/lib/md";
import { catStyle, cn, relTime } from "@/lib/utils";
import { useApp } from "@/store/app";
import { useUI } from "@/store/ui";
import type { Category, KanbanCard } from "@/types/database";

type Tab = "doc" | "kanban" | "lista";
const TEMPLATES = [
  { icon: "📋", name: "Rotina Diária", sub: "Blocos de foco", body: "# Rotina Diária\n\n## Manhã\n- [ ] Planejar as 3 prioridades\n- [ ] Bloco de foco profundo (45 min)\n\n## Tarde\n- [ ] Reuniões e respostas\n- [ ] Revisão rápida\n\n## Noite\n- [ ] Shutdown diário\n- [ ] Preparar o dia seguinte\n" },
  { icon: "🎯", name: "Metas Trimestrais", sub: "OKRs & Prazos", body: "# Metas Trimestrais\n\n## Objetivo 1\n- [ ] Resultado-chave 1\n- [ ] Resultado-chave 2\n\n## Objetivo 2\n- [ ] Resultado-chave 1\n- [ ] Resultado-chave 2\n" },
  { icon: "🧪", name: "Pesquisa & Resumo", sub: "Citações e síntese", body: "# Pesquisa & Resumo\n\n> Pergunta central:\n\n## Fontes\n- \n\n## Síntese\n\n## Próximos passos\n- [ ] \n" },
  { icon: "💰", name: "Finanças do Mês", sub: "Entradas & Gastos", body: "# Finanças do Mês\n\n## Entradas\n- \n\n## Gastos fixos\n- \n\n## Metas de economia\n- [ ] \n" },
];
const COLS: { id: KanbanCard["column"]; label: string; dot: string }[] = [{ id: "todo", label: "A Fazer", dot: "bg-primary-soft" }, { id: "doing", label: "Em Andamento", dot: "bg-periwinkle" }, { id: "done", label: "Concluído", dot: "bg-emerald" }];

export default function Espacos() {
  const [tab, setTab] = useState<Tab>("doc");
  return (
    <div className="flex flex-col gap-6">
      <PageHeader eyebrow="Segundo Cérebro" title="Espaços & Notas" right={
        <div className="flex rounded-lg border border-stroke bg-surface-1 p-1" role="tablist">
          {([["doc", "Documento", FileText], ["kanban", "Quadro Kanban", KanbanSquare], ["lista", "Lista", List]] as const).map(([id, label, Icon]) => (
            <button key={id} role="tab" aria-label={label} aria-selected={tab === id} onClick={() => setTab(id)} className={cn("flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-semibold", tab === id ? "bg-surface-3 text-white" : "text-ink-dim")}><Icon size={14} /><span className={tab === id ? "" : "hidden sm:inline"}>{label}</span></button>
          ))}
        </div>
      } />
      {tab === "doc" && <Docs />}
      {tab === "kanban" && <Kanban />}
      {tab === "lista" && <Lista />}
      <footer className="flex items-center gap-2 text-xs text-ink-mute"><span className="h-1.5 w-1.5 rounded-full bg-emerald" />Salvo localmente (IndexedDB) · funciona offline</footer>
    </div>
  );
}

function Docs() {
  const { notes, addNote, updateNote, deleteNote, toast } = useApp();
  const [sel, setSel] = useState<string | null>(null);
  const [edit, setEdit] = useState(false);
  const sorted = useMemo(() => [...notes].sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned) || (a.updated_at < b.updated_at ? 1 : -1)), [notes]);
  const note = notes.find((n) => n.id === sel) ?? sorted[0];
  const prog = note ? checklistProgress(note.body) : { done: 0, total: 0 };
  const create = (title?: string, body?: string) => { const n = addNote(title ? { title, body } : undefined); setSel(n.id); setEdit(true); toast("Nota criada"); };

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside className="flex flex-col gap-3">
        <button className="btn-primary" onClick={() => create()}><Plus size={16} />Nova nota</button>
        <ul className="flex max-h-[40vh] flex-col gap-1 overflow-y-auto lg:max-h-none">
          {sorted.map((n) => (
            <li key={n.id}><button onClick={() => { setSel(n.id); setEdit(false); }} className={cn("flex w-full flex-col gap-0.5 rounded-lg border px-3 py-2.5 text-left", note?.id === n.id ? "border-primary/50 bg-primary/10" : "border-transparent hover:bg-surface-2")}>
              <span className="flex items-center gap-1.5 truncate text-sm font-semibold">{n.pinned && <Star size={12} className="shrink-0 fill-amber text-amber" />}{n.title}</span>
              <span className="text-[11px] text-ink-mute">{n.space} · {relTime(n.updated_at)}</span></button></li>
          ))}
          {!sorted.length && <li className="text-sm text-ink-mute">Nenhuma nota ainda.</li>}
        </ul>
        <div>
          <div className="eyebrow mb-2">Modelos rápidos do espaço</div>
          <div className="grid grid-cols-2 gap-2">
            {TEMPLATES.map((t) => <button key={t.name} onClick={() => create(t.name, t.body)} className="card card-hover flex flex-col gap-0.5 p-2.5 text-left"><span className="text-lg">{t.icon}</span><span className="text-xs font-semibold">{t.name}</span><span className="text-[11px] text-ink-mute">{t.sub}</span></button>)}
          </div>
        </div>
      </aside>

      {note ? (
        <article className="min-w-0 rounded-xl border border-stroke bg-surface-1/70 p-4 sm:p-6">
          <div className="mb-4 flex flex-wrap items-center gap-2 text-xs text-ink-mute"><span>Espaços</span>/<span>{note.space}</span>/<span className="text-primary-soft">{note.title}</span>
            <div className="ml-auto flex gap-1.5">
              <button className="btn-ghost btn-sm" onClick={() => updateNote(note.id, { pinned: !note.pinned })} aria-pressed={!!note.pinned}><Star size={13} className={note.pinned ? "fill-amber text-amber" : ""} />Fixar</button>
              <button className="btn-ghost btn-sm" onClick={() => setEdit(!edit)}>{edit ? <><Eye size={13} />Visualizar</> : <><Pencil size={13} />Editar</>}</button>
              <button className="btn-ghost btn-sm hover:!text-coral-soft" onClick={() => { deleteNote(note.id); setSel(null); toast("Nota excluída"); }} aria-label="Excluir nota"><Trash2 size={13} /></button>
            </div>
          </div>
          <input value={note.title} onChange={(e) => updateNote(note.id, { title: e.target.value })} aria-label="Título da nota" className="w-full bg-transparent text-3xl font-bold tracking-[-0.03em] outline-none" maxLength={120} />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {note.tags.map((t) => <span key={t} className="chip !text-primary-soft">#{t}</span>)}
            <input placeholder="+ tag (Enter)" aria-label="Adicionar tag" className="h-7 w-28 rounded-full border border-dashed border-stroke bg-transparent px-3 text-xs outline-none focus:border-primary" maxLength={20}
              onKeyDown={(e) => { if (e.key === "Enter") { const v = e.currentTarget.value.trim().replace(/^#/, ""); if (v && !note.tags.includes(v)) updateNote(note.id, { tags: [...note.tags, v] }); e.currentTarget.value = ""; } }} />
            {prog.total > 0 && <span className="ml-auto chip !text-emerald-soft"><CheckSquare size={12} />{prog.done}/{prog.total} concluídos</span>}
          </div>
          {prog.total > 0 && <Bar value={prog.done / prog.total} color="bg-emerald" className="mt-3" />}
          <div className="mt-5">
            {edit ? (
              <>
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {[["Título", "\n## "], ["Tarefa", "\n- [ ] "], ["Lista", "\n- "], ["Citação", "\n> "], ["Código", "\n```\n\n```\n"]].map(([l, ins]) => (
                    <button key={l} className="chip hover:!border-primary/50" onClick={() => updateNote(note.id, { body: note.body + ins })}>+ {l}</button>
                  ))}
                </div>
                <textarea value={note.body} onChange={(e) => updateNote(note.id, { body: e.target.value })} aria-label="Conteúdo (Markdown)" spellCheck className="mono min-h-[360px] w-full resize-y rounded-lg border border-stroke bg-surface-lowest p-4 text-sm leading-relaxed outline-none focus:border-primary" />
              </>
            ) : (
              <div className="text-[15px]">{renderMd(note.body, (line) => updateNote(note.id, { body: toggleLine(note.body, line) }))}</div>
            )}
          </div>
        </article>
      ) : <Empty>Crie sua primeira nota ou use um modelo rápido.</Empty>}
    </div>
  );
}

function Kanban() {
  const { cards, addCard, moveCard, deleteCard } = useApp();
  const [title, setTitle] = useState("");
  const [tag, setTag] = useState("Estudos");
  const [drag, setDrag] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const submit = (e: React.FormEvent) => { e.preventDefault(); if (!title.trim()) return; addCard({ title: title.trim(), tag: tag.trim() || "Geral" }); setTitle(""); };
  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={submit} className="flex flex-wrap gap-2">
        <input className="input min-w-[200px] flex-1" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Novo card…" aria-label="Título do card" maxLength={100} />
        <input className="input w-36" value={tag} onChange={(e) => setTag(e.target.value)} aria-label="Tag" maxLength={20} />
        <button className="btn-primary"><Plus size={16} />Novo Card</button>
      </form>
      <div className="grid gap-4 md:grid-cols-3">
        {COLS.map((col) => {
          const list = cards.filter((c) => c.column === col.id).sort((a, b) => a.position - b.position);
          return (
            <section key={col.id} onDragOver={(e) => { e.preventDefault(); setOver(col.id); }} onDragLeave={() => setOver(null)} onDrop={() => { if (drag) moveCard(drag, col.id); setDrag(null); setOver(null); }}
              className={cn("flex min-h-[200px] flex-col gap-3 rounded-xl border bg-surface-1/60 p-3 transition", over === col.id ? "border-primary" : "border-stroke")} aria-label={col.label}>
              <h3 className="flex items-center gap-2 text-sm font-semibold"><span className={cn("h-2 w-2 rounded-full", col.dot)} />{col.label}<span className="ml-auto rounded bg-surface-3 px-1.5 text-xs">{list.length}</span></h3>
              {list.map((c) => (
                <div key={c.id} draggable onDragStart={() => setDrag(c.id)} onDragEnd={() => setDrag(null)} className={cn("card card-hover cursor-grab p-3 active:cursor-grabbing", drag === c.id && "opacity-40")}>
                  <div className="flex items-center justify-between text-[11px]"><span className={cn("font-semibold", catStyle(c.tag).text)}>#{c.tag}</span>{c.priority === "high" && <span className="font-bold text-coral-soft">P1</span>}</div>
                  <div className={cn("mt-1 text-sm font-semibold", c.column === "done" && "text-ink-mute line-through")}>{c.title}</div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex gap-1">
                      <button aria-label="Mover para a esquerda" disabled={col.id === "todo"} onClick={() => moveCard(c.id, COLS[COLS.findIndex((x) => x.id === col.id) - 1].id)} className="grid h-7 w-7 place-items-center rounded-md text-ink-mute hover:bg-surface-3 disabled:opacity-25"><ArrowLeft size={14} /></button>
                      <button aria-label="Mover para a direita" disabled={col.id === "done"} onClick={() => moveCard(c.id, COLS[COLS.findIndex((x) => x.id === col.id) + 1].id)} className="grid h-7 w-7 place-items-center rounded-md text-ink-mute hover:bg-surface-3 disabled:opacity-25"><ArrowRight size={14} /></button>
                    </div>
                    <button aria-label="Excluir card" onClick={() => deleteCard(c.id)} className="grid h-7 w-7 place-items-center rounded-md text-ink-mute hover:bg-coral/10 hover:text-coral-soft"><Trash2 size={13} /></button>
                  </div>
                </div>
              ))}
              {!list.length && <div className="rounded-lg border border-dashed border-stroke p-4 text-center text-xs text-ink-mute">Arraste cards para cá</div>}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function Lista() {
  const tasks = useApp((s) => s.tasks);
  const openAdd = useUI((s) => s.openAdd);
  const cats: Category[] = ["Trabalho", "Estudos", "Saúde", "Pessoal"];
  return (
    <div className="flex flex-col gap-6">
      <button className="btn-primary self-start" onClick={() => openAdd(undefined, "task")}><Plus size={16} />Nova tarefa</button>
      <div className="grid gap-6 md:grid-cols-2">
        {cats.map((c) => {
          const list = tasks.filter((t) => t.category === c).sort((a, b) => Number(a.completed) - Number(b.completed) || ((a.due_date ?? "9") < (b.due_date ?? "9") ? -1 : 1));
          const done = list.filter((t) => t.completed).length;
          return (
            <section key={c}>
              <div className="mb-2 flex items-center gap-2 text-sm font-semibold"><span className={cn("h-2.5 w-2.5 rounded-full", catStyle(c).dot)} />{c}<span className="ml-auto text-xs font-normal text-ink-mute">{done}/{list.length}</span></div>
              <div className="flex flex-col gap-2">{list.length ? list.map((t) => <TaskRow key={t.id} task={t} showDate onDelete />) : <Empty>Sem tarefas em {c}.</Empty>}</div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
