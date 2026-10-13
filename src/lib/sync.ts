import { db, TABLES, type TableName } from "./db";
import { supabase } from "./supabase";

// Sincronização local-first simples (última escrita vence), por tabela local, via public.nx_records (ver supabase/schema.sql).
export interface Tombstone { tbl: TableName; id: string; at: string }
export interface SyncResult { pushed: number; pulled: number; at: string }

type Row = { id: string; updated_at?: string };

export async function syncAll(userId: string, since: string | null, tombstones: Tombstone[]): Promise<SyncResult> {
  const sb = supabase();
  if (!sb) throw new Error("Supabase não configurado");
  const d = db();
  let pushed = 0, pulled = 0;
  const started = new Date().toISOString();

  for (const tbl of TABLES) {
    const table = d[tbl] as unknown as import("dexie").Table<Row, string>;
    const local = (await table.toArray()).filter((r) => !since || (r.updated_at ?? "") > since);
    const up = local.map((r) => ({ user_id: userId, tbl, id: r.id, data: r, updated_at: r.updated_at ?? started, deleted: false }));
    const dead = tombstones.filter((t) => t.tbl === tbl).map((t) => ({ user_id: userId, tbl, id: t.id, data: {}, updated_at: t.at, deleted: true }));
    const batch = [...up, ...dead];
    if (batch.length) {
      const { error } = await sb.from("nx_records").upsert(batch, { onConflict: "user_id,tbl,id" });
      if (error) throw error;
      pushed += batch.length;
    }
  }
  let q = sb.from("nx_records").select("tbl,id,data,updated_at,deleted").eq("user_id", userId);
  if (since) q = q.gt("updated_at", since);
  const { data, error } = await q;
  if (error) throw error;
  for (const row of data ?? []) {
    if (!TABLES.includes(row.tbl as TableName)) continue;
    const table = d[row.tbl as TableName] as unknown as import("dexie").Table<Row, string>;
    const cur = await table.get(row.id);
    if (cur && (cur.updated_at ?? "") >= row.updated_at) continue;
    if (row.deleted) await table.delete(row.id);
    else await table.put(row.data as Row);
    pulled++;
  }
  return { pushed, pulled, at: started };
}
