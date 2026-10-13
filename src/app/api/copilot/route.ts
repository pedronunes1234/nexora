import { NextResponse } from "next/server";
import type { CalendarEvent, Task } from "@/types/database";

export const runtime = "nodejs";

const SYSTEM = `Você é o Nexora Copilot, assistente de agenda em português do Brasil.
Receba o pedido do usuário e a agenda atual (JSON) e devolva SEMPRE a ferramenta propose_schedule.
Regras:
- "move": reprograma um compromisso existente (use refId do evento) para um novo horário livre.
- "create": cria um novo bloco (por exemplo foco profundo) em horário livre.
- Nunca crie sobreposição com eventos que continuam no mesmo dia.
- Datas YYYY-MM-DD, horas HH:MM (24h). durationMin em minutos.
- message: 1 ou 2 frases curtas explicando o que foi planejado.`;

const TOOL = {
  name: "propose_schedule",
  description: "Propõe mudanças na agenda para o usuário revisar e aplicar.",
  input_schema: {
    type: "object",
    properties: {
      message: { type: "string" },
      changes: {
        type: "array",
        items: {
          type: "object",
          properties: {
            kind: { type: "string", enum: ["move", "create"] },
            refId: { type: "string" },
            title: { type: "string" },
            category: { type: "string", enum: ["Trabalho", "Estudos", "Saúde", "Pessoal"] },
            from: { type: "object", properties: { date: { type: "string" }, start: { type: "string" }, end: { type: "string" } } },
            to: { type: "object", properties: { date: { type: "string" }, start: { type: "string" }, end: { type: "string" } }, required: ["date", "start", "end"] },
            durationMin: { type: "number" },
            focus: { type: "boolean" },
            dnd: { type: "boolean" },
          },
          required: ["kind", "title", "category", "to", "durationMin"],
        },
      },
    },
    required: ["message", "changes"],
  },
};

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const YMD = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(req: Request) {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return NextResponse.json({ source: "local" });
  let body: { text: string; events: CalendarEvent[]; tasks: Task[]; now: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "JSON inválido" }, { status: 400 }); }
  if (!body.text || typeof body.text !== "string") return NextResponse.json({ error: "Texto obrigatório" }, { status: 400 });

  const ctx = {
    agora: body.now,
    eventos: (body.events ?? []).slice(0, 80).map((e) => ({ id: e.id, titulo: e.title, data: e.date, inicio: e.start_time, fim: e.end_time, area: e.area, tipo: e.kind })),
    tarefas: (body.tasks ?? []).filter((t) => !t.completed).slice(0, 40).map((t) => ({ titulo: t.title, data: t.due_date, hora: t.due_time, prioridade: t.priority })),
  };
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
        max_tokens: 1500,
        system: SYSTEM,
        tools: [TOOL],
        tool_choice: { type: "tool", name: "propose_schedule" },
        messages: [{ role: "user", content: `Agenda atual:\n${JSON.stringify(ctx)}\n\nPedido: ${body.text.slice(0, 600)}` }],
      }),
    });
    if (!r.ok) return NextResponse.json({ source: "local", error: `Anthropic ${r.status}` });
    const data = await r.json();
    const block = (data.content ?? []).find((b: { type: string }) => b.type === "tool_use");
    const input = block?.input;
    if (!input || !Array.isArray(input.changes)) return NextResponse.json({ source: "local" });
    const ids = new Set((body.events ?? []).map((e) => e.id));
    const changes = input.changes
      .filter((c: { to?: { date: string; start: string; end: string }; kind: string; refId?: string }) => c.to && YMD.test(c.to.date) && HHMM.test(c.to.start) && HHMM.test(c.to.end) && (c.kind === "create" || (c.refId && ids.has(c.refId))))
      .map((c: Record<string, unknown>) => ({ ...c, id: crypto.randomUUID() }));
    return NextResponse.json({ source: "claude", message: String(input.message ?? ""), changes });
  } catch {
    return NextResponse.json({ source: "local" });
  }
}
