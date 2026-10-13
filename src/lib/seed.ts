import type { CalendarEvent, FocusSession, HabitLog, KanbanCard, Note, NotificationItem, Task } from "@/types/database";
import { addDays, nowIso, ymd } from "./utils";

export type Persona = "estudos" | "projetos" | "criativo" | "rotina";

const base = (uid: string) => ({ user_id: uid, updated_at: nowIso() });

/** Blocos iniciais criados pelo onboarding, conforme o perfil de produtividade. */
export function starterData(uid: string, persona: Persona, peakStart: string) {
  const T = ymd(new Date());
  const A = ymd(addDays(new Date(), 1));
  const ev = (title: string, date: string, s: string, e: string, area: CalendarEvent["area"], extra: Partial<CalendarEvent> = {}): CalendarEvent => ({
    id: crypto.randomUUID(), ...base(uid), title, date, start_time: s, end_time: e, area, alarm: true, alarm_lead_min: 10, kind: "event", ...extra,
  });
  const peakH = parseInt(peakStart.slice(0, 2), 10);
  const hh = (h: number) => `${String(h).padStart(2, "0")}:00`;
  const events: CalendarEvent[] = [];
  if (persona === "estudos") {
    events.push(ev("Estudo profundo (Pomodoro 45 min)", A, hh(peakH), hh(peakH + 1), "Estudos", { kind: "focus", dnd: true }));
    events.push(ev("Revisão de flashcards", A, hh(peakH + 1) , `${String(peakH + 1).padStart(2, "0")}:30`, "Estudos"));
    events.push(ev("Exercícios de fixação", A, hh(peakH + 2), hh(peakH + 3), "Estudos", { kind: "focus", dnd: true }));
  } else if (persona === "projetos") {
    events.push(ev("Planejamento da semana", A, "09:00", "09:30", "Trabalho"));
    events.push(ev("Bloco de foco: entrega principal", A, hh(peakH), hh(peakH + 2), "Trabalho", { kind: "focus", dnd: true }));
  } else if (persona === "criativo") {
    events.push(ev("Deep work criativo", A, hh(peakH), hh(peakH + 2), "Trabalho", { kind: "focus", dnd: true }));
    events.push(ev("Anotações e ideias", A, hh(peakH + 2), `${String(peakH + 2).padStart(2, "0")}:30`, "Pessoal"));
  } else {
    events.push(ev("Treino", A, "07:00", "08:00", "Saúde"));
    events.push(ev("Leitura (20 min)", A, "21:00", "21:30", "Pessoal"));
  }
  const tasks: Task[] = [
    { id: crypto.randomUUID(), ...base(uid), title: "Definir as 3 prioridades de amanhã", category: "Pessoal", due_date: T, completed: false, priority: "medium", alarm: false, alarm_lead_min: 0, position: 0 },
  ];
  const note: Note = { id: crypto.randomUUID(), ...base(uid), title: "Bem-vindo ao NEXORA", space: "Segundo Cérebro", tags: ["Início"], pinned: true,
    body: "# Bem-vindo ao NEXORA\n\nUse o **Comando Rápido** na tela Meu Dia, por exemplo:\n\n- Estudar biologia amanhã às 19h com lembrete\n- Reunião com a Ana sexta às 15h\n\n## Primeiros passos\n- [ ] Iniciar uma sessão de foco\n- [x] Concluir o onboarding\n- [ ] Pedir ao Copilot para reorganizar a tarde\n" };
  return { events, tasks, notes: [note] };
}

/** Dados de exemplo (opcional) para explorar telas com histórico: estatísticas, agenda cheia, kanban. */
export function demoData(uid: string) {
  const now = new Date();
  const T = ymd(now);
  const A = ymd(addDays(now, 1));
  const b = () => ({ id: crypto.randomUUID(), ...base(uid) });
  const events: CalendarEvent[] = [
    { ...b(), title: "Rotina Matinal & Planejamento", date: T, start_time: "08:00", end_time: "08:30", area: "Pessoal", alarm: false, alarm_lead_min: 0, kind: "event" },
    { ...b(), title: "Sprint Review & Design System", description: "Core Team", date: T, start_time: "10:00", end_time: "11:30", area: "Trabalho", meet_url: "https://meet.example.com/sprint-44", alarm: true, alarm_lead_min: 10, kind: "event" },
    { ...b(), title: "Alinhamento Estratégico SaaS Nexora", description: "Planejamento de releases Q4 & arquitetura do Core Engine", date: T, start_time: "14:30", end_time: "15:30", area: "Trabalho", meet_url: "https://meet.example.com/alinhamento", alarm: true, alarm_lead_min: 10, kind: "event" },
    { ...b(), title: "Revisão de Biologia Celular", description: "Ciclo de Krebs e Fosforilação Oxidativa", date: T, start_time: "16:30", end_time: "17:15", area: "Estudos", alarm: true, alarm_lead_min: 10, kind: "focus", dnd: true },
    { ...b(), title: "Academia / Treino Superior", date: T, start_time: "19:00", end_time: "20:00", area: "Saúde", alarm: true, alarm_lead_min: 15, kind: "event" },
    { ...b(), title: "Retrospectiva semanal", date: A, start_time: "10:00", end_time: "11:00", area: "Trabalho", alarm: true, alarm_lead_min: 10, kind: "event" },
  ];
  const tk = (title: string, o: Partial<Task>): Task => ({ ...b(), title, category: "Trabalho", completed: false, priority: "medium", alarm: false, alarm_lead_min: 0, position: 0, ...o });
  const tasks: Task[] = [
    tk("Finalizar especificações da API de Notificações", { note: "Arquitetura v1", completed: true, completed_at: nowIso(), due_date: T }),
    tk("Configurar Web Push & Som de Alerta customizado", { priority: "high", alarm: true, due_date: T, due_time: "18:00", alarm_lead_min: 10 }),
    tk("Revisar métricas de conversão de usuários", { note: "Analytics 2.0", due_date: T }),
    tk("Sincronizar notas com banco vetorial", { category: "Trabalho", due_date: A, priority: "low" }),
    tk("Responder e-mails do time", { completed: true, completed_at: nowIso(), due_date: T, priority: "low" }),
    tk("Resolver 15 exercícios dissertativos", { category: "Estudos", priority: "high", due_date: A }),
    tk("Treino de mobilidade", { category: "Saúde", due_date: A, priority: "low" }),
  ];
  const sessions: FocusSession[] = [];
  for (let i = 0; i < 14; i++) {
    const day = addDays(now, -i);
    const n = i === 0 ? 3 : 1 + ((i * 7) % 4);
    for (let k = 0; k < n; k++) {
      const hour = [9, 11, 14, 16, 20][(i + k) % 5];
      const d = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, 10);
      if (d > now) continue;
      sessions.push({ ...b(), duration_minutes: [25, 45, 45, 90][(i + k) % 4], completed_at: d.toISOString(), binaural_preset: (["alpha_10hz", "gamma_40hz", "brown_noise"] as const)[(i + k) % 3], task_title: ["Revisar métricas de conversão de usuários", "Resolver 15 exercícios dissertativos", "Finalizar especificações da API de Notificações", "Treino de mobilidade"][(i + k) % 4] });
    }
  }
  const habits: HabitLog[] = [];
  for (let i = 0; i < 14; i++) {
    const date = ymd(addDays(now, -i));
    (["water", "reading", "workout"] as const).forEach((h, j) => {
      if (i === 0 && h !== "water") return;
      if ((i + j) % 6 === 5) return;
      habits.push({ id: `${date}:${h}`, user_id: uid, date, habit: h, value: h === "water" ? 2500 : h === "reading" ? 20 : 1, updated_at: nowIso() });
    });
  }
  const cards: KanbanCard[] = [
    { ...b(), title: "Resumo Fosforilação Oxidativa", tag: "Estudos", column: "todo", priority: "high", position: 0 },
    { ...b(), title: "Livro Alberts: Célula Cap. 12", tag: "Leitura", column: "todo", priority: "low", position: 1 },
    { ...b(), title: "50 Flashcards de metabolismo", tag: "Revisão", column: "doing", priority: "medium", position: 0 },
    { ...b(), title: "Mapa visual do gradiente de prótons", tag: "Estudos", column: "done", priority: "medium", position: 0 },
  ];
  const notes: Note[] = [
    { ...b(), title: "Ciclo de Krebs & Bioenergética", space: "Estudos & Academia", tags: ["Estudos", "Biologia"], body: "# Ciclo de Krebs & Bioenergética\n\nResumo da aula sobre **respiração celular**.\n\n## Metas & checkpoints\n- [x] Leitura do Capítulo 4: Teoria quimiosmótica\n- [ ] Mapeamento metabólico da glicólise e citrato\n- [ ] Resolver 15 exercícios dissertativos\n\n## Notas de aula\n- Cada volta do ciclo gera 3 NADH, 1 FADH2 e 1 GTP\n- A fosforilação oxidativa ocorre na membrana interna da mitocôndria\n" },
  ];
  const notifications: NotificationItem[] = [
    { ...b(), kind: "alarm", title: "Alarme disparado: Estudar Biologia", body: "O alerta sonoro com timbre Nexora Pulse tocou. Sessão cronometrada em andamento.", created_at: new Date(Date.now() - 45 * 60000).toISOString(), read: false, priority: "high", action: { type: "open", href: "/agenda", label: "Ver bloco na agenda" } },
    { ...b(), kind: "copilot", title: "Sugestão de reprogramação", body: "Detectamos pausa de 20 min sem atividade. Deseja empurrar a revisão de Química Orgânica para as 17:00 sem gerar conflito?", created_at: new Date(Date.now() - 2 * 3600000).toISOString(), read: false, action: { type: "open", href: "/ia?q=Adie+as+reuni%C3%B5es+da+tarde+para+amanh%C3%A3+ap%C3%B3s+as+14h", label: "Aceitar ajuste (1 clique)" } },
    { ...b(), kind: "habit", title: "Meta de hidratação", body: "2.5 L de água atingidos com sucesso! Seu ritmo circadiano segue calibrado.", created_at: new Date(Date.now() - 4 * 3600000).toISOString(), read: true },
    { ...b(), kind: "system", title: "Backup local concluído", body: "Notas e tarefas salvas no IndexedDB deste dispositivo.", created_at: new Date(Date.now() - 20 * 3600000).toISOString(), read: true },
    { ...b(), kind: "focus", title: "Pomodoro adiado em 10m", body: "Sessão de Ciclo de Krebs reativada com sucesso.", created_at: new Date(Date.now() - 22 * 3600000).toISOString(), read: true },
  ];
  return { events, tasks, sessions, habits, cards, notes, notifications };
}
