// Kontobasierte Premium-Inhalte: Credits, Käufe und Komfortfreischaltungen pro Benutzerkonto.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PREMIUM_ITEMS } from "@/game/data";

/* eslint-disable @typescript-eslint/no-explicit-any */
async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

export interface Entitlements {
  credits: number;
  owned: string[];
  saveSlots: number;
  advancedStats: boolean;
  theme: string;
  lastBonusAt: string | null;
}

function shape(row: any): Entitlements {
  return {
    credits: Number(row?.credits ?? 0),
    owned: Array.isArray(row?.owned) ? (row.owned as string[]) : [],
    saveSlots: Number(row?.save_slots ?? 8),
    advancedStats: Boolean(row?.advanced_stats),
    theme: String(row?.theme ?? "Standard"),
    lastBonusAt: (row?.updated_at as string | null) ?? null,
  };
}

async function ensureRow(db: any, userId: string) {
  const { data } = await db.from("user_entitlements").select("*").eq("user_id", userId).maybeSingle();
  if (data) return data;
  const { data: created, error } = await db
    .from("user_entitlements")
    .insert({ user_id: userId })
    .select("*")
    .single();
  if (error) throw error;
  return created;
}

export const getEntitlements = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Entitlements> => {
    const db = await admin();
    return shape(await ensureRow(db, context.userId));
  });

export const buyEntitlement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { itemId: string }) => z.object({ itemId: z.string().min(2).max(40) }).parse(input))
  .handler(async ({ data, context }): Promise<Entitlements> => {
    const db = await admin();
    const item = PREMIUM_ITEMS.find((i) => i.id === data.itemId);
    if (!item) throw new Error("Unbekannter Artikel.");
    const row = await ensureRow(db, context.userId);
    const owned: string[] = Array.isArray(row.owned) ? row.owned : [];
    if (owned.includes(item.id)) throw new Error("Bereits im Besitz.");
    if (Number(row.credits) < item.price) throw new Error("Nicht genug Credits.");

    const patch: Record<string, unknown> = {
      credits: Number(row.credits) - item.price,
      owned: [...owned, item.id],
    };
    if (item.id === "cmf_slots") patch["save_slots"] = Number(row.save_slots) + 4;
    if (item.id === "cmf_stats") patch["advanced_stats"] = true;
    if (item.kind === "theme") patch["theme"] = item.name;

    const { data: updated, error } = await db
      .from("user_entitlements")
      .update(patch)
      .eq("user_id", context.userId)
      .select("*")
      .single();
    if (error) throw error;
    return shape(updated);
  });

/** Tagesbonus: alle 20 Stunden 120 Credits fürs Konto. */
export const claimDailyCredits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<Entitlements> => {
    const db = await admin();
    const row = await ensureRow(db, context.userId);
    const last = new Date(row.updated_at ?? row.created_at ?? 0).getTime();
    const fresh = new Date(row.created_at ?? 0).getTime() === last;
    if (!fresh && Date.now() - last < 20 * 60 * 60_000) {
      throw new Error("Tagesbonus schon abgeholt – komm später wieder.");
    }
    const { data: updated, error } = await db
      .from("user_entitlements")
      .update({ credits: Number(row.credits) + 120 })
      .eq("user_id", context.userId)
      .select("*")
      .single();
    if (error) throw error;
    return shape(updated);
  });
