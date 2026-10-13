# NEXORA

Produtividade circadiana com IA: agenda inteligente, foco em fluxo (ondas binaurais), Copilot de reagendamento, alarmes sonoros, notas em Markdown e Kanban. **Local-first, gratuito e offline.** Design system: Kinetic Obsidian.

## Rodar

```bash
npm install
npm run dev        # http://localhost:3000
# produção
npm run build && npm start
```

Na primeira abertura o onboarding (4 passos) configura perfil, pico circadiano, timbre e meta de foco, e pode carregar dados de exemplo.

## Variáveis opcionais (`.env.local`, veja `.env.example`)

| Variável | Para quê |
|---|---|
| `ANTHROPIC_API_KEY` | O Copilot (`/api/copilot`) usa Claude com tool use para propor mudanças na agenda. Sem a chave, usa o interpretador local em `src/lib/copilot.ts`. |
| `ANTHROPIC_MODEL` | Modelo (padrão `claude-sonnet-5-5`). |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Login e sincronização entre dispositivos. Rode `supabase/schema.sql` no seu projeto. Sem elas, tudo roda só neste dispositivo. |

## Arquitetura

- Next.js 15 (App Router), React 19, TypeScript, Tailwind 3.
- **Zustand** (`src/store`): estado, configurações persistidas e motor de alarmes. **Dexie/IndexedDB** (`src/lib/db.ts`): dados locais.
- **Web Audio** (`src/lib/audio.ts`): binaural Alfa 10 Hz (200/210 Hz), Gama 40 Hz, Teta 6 Hz, chuva, café, ruído marrom e 4 timbres de alerta, tudo sintetizado.
- **NLP em português** (`src/lib/nlp.ts`): "Estudar biologia amanhã às 19h com lembrete #Estudos".
- **Copilot** (`src/lib/copilot.ts`, `src/app/api/copilot`): preview antes/depois, detecção de conflitos e aplicação em 1 clique.
- **PWA**: `public/manifest.webmanifest` e `public/sw.js` (registrado em produção).
- **Sync** (`src/lib/sync.ts`): última escrita vence, via tabela `nx_records` com RLS.

## Telas

Meu Dia (3 colunas no desktop), Agenda (dia/semana/mês/linha do tempo), Flow Timer, Copilot, Lembretes, Notificações, Espaços (documento, Kanban com arrastar, lista), Estatísticas, Perfil/Ajustes, Onboarding e Entrar.

## Limites conhecidos

- Alarmes só tocam com o app aberto; notificações do sistema exigem permissão. Push com o app fechado exigiria um servidor de Web Push.
- O medidor HRV/energia mental das telas do Stitch não foi implementado (precisa de sensor); o dashboard usa foco e tarefas.
- A tela de planos pagos foi omitida porque o modelo é 100% gratuito.
- Sincronização com Supabase e Copilot com a API da Anthropic dependem das suas chaves e não foram testados aqui.
