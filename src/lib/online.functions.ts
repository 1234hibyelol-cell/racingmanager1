// Geprüfte Online-Aktionen (Beitritt, Ausbau, Forschung, Anweisungen) – laufen serverseitig.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  HQ_KEYS,
  HQ_MAX,
  hqCost,
  ONLINE_SPONSORS,
  RESEARCH_NODES,
  STAFF_ROLES,
  TRAIN_DRIVER_COST,
  TRAIN_STAFF_COST,
} from "@/game/online/config";

/* eslint-disable @typescript-eslint/no-explicit-any */
async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

async function ownTeam(db: any, userId: string) {
  const { data } = await db.from("teams").select("*").eq("user_id", userId).maybeSingle();
  if (!data) throw new Error("Kein Online-Team vorhanden.");
  return data;
}

export const joinLeague = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { teamName: string; color: string }) =>
    z.object({ teamName: z.string().trim().min(3).max(28), color: z.string().regex(/^#[0-9a-fA-F]{6}$/) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: existing } = await db.from("teams").select("id,league_id").eq("user_id", context.userId).maybeSingle();
    if (existing) return { teamId: existing.id, leagueId: existing.league_id };

    const { findOpenLeague, makeDriver } = await import("@/lib/online-sim.server");
    const leagueId = await findOpenLeague();
    const { data: bot } = await db
      .from("teams")
      .select("id")
      .eq("league_id", leagueId)
      .eq("is_bot", true)
      .limit(1)
      .maybeSingle();
    if (!bot) throw new Error("Liga ist voll, bitte erneut versuchen.");

    const { data: team, error } = await db
      .from("teams")
      .update({
        user_id: context.userId,
        is_bot: false,
        name: data.teamName,
        color: data.color,
        budget: 8_000_000,
        drivers: [makeDriver(62), makeDriver(55)],
      })
      .eq("id", bot.id)
      .select("id,league_id")
      .single();
    if (error) throw error;
    return { teamId: team.id, leagueId: team.league_id };
  });

export const setStrategy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { strategy: string }) =>
    z.object({ strategy: z.enum(["push", "normal", "conserve"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const db = await admin();
    const team = await ownTeam(db, context.userId);
    await db.from("teams").update({ strategy: data.strategy }).eq("id", team.id);
    return { ok: true };
  });

export const upgradeHq = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { key: string }) => z.object({ key: z.enum(HQ_KEYS) }).parse(input))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const team = await ownTeam(db, context.userId);
    const hq = { ...(team.hq ?? {}) } as Record<string, number>;
    const level = Number(hq[data.key] ?? 1);
    if (level >= HQ_MAX) throw new Error("Maximale Stufe erreicht.");
    const cost = hqCost(level);
    if (team.budget < cost) throw new Error("Budget reicht nicht.");
    hq[data.key] = level + 1;
    await db.from("teams").update({ hq, budget: team.budget - cost }).eq("id", team.id);
    return { ok: true };
  });

export const unlockResearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { nodeId: string }) => z.object({ nodeId: z.string().min(2).max(40) }).parse(input))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const team = await ownTeam(db, context.userId);
    const node = RESEARCH_NODES.find((n) => n.id === data.nodeId);
    if (!node) throw new Error("Unbekannter Forschungsknoten.");
    const research = { ...(team.research ?? {}) } as Record<string, any>;
    const unlocked: string[] = Array.isArray(research["unlocked"]) ? research["unlocked"] : [];
    if (unlocked.includes(node.id)) throw new Error("Bereits erforscht.");
    if (node.requires && !unlocked.includes(node.requires)) throw new Error("Voraussetzung fehlt.");
    if (team.budget < node.cost) throw new Error("Budget reicht nicht.");
    research["unlocked"] = [...unlocked, node.id];
    research[node.branch] = Number(research[node.branch] ?? 0) + node.gain;
    await db.from("teams").update({ research, budget: team.budget - node.cost }).eq("id", team.id);
    return { ok: true };
  });

export const trainDriver = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { index: number }) => z.object({ index: z.number().int().min(0).max(1) }).parse(input))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const team = await ownTeam(db, context.userId);
    if (team.budget < TRAIN_DRIVER_COST) throw new Error("Budget reicht nicht.");
    const drivers = Array.isArray(team.drivers) ? [...team.drivers] : [];
    const d = drivers[data.index];
    if (!d) throw new Error("Fahrer nicht gefunden.");
    const sim = Number((team.hq ?? {}).simulator ?? 1);
    drivers[data.index] = {
      ...d,
      rating: Math.min(99, Number(d.rating ?? 60) + 1 + Math.round(sim / 3)),
      form: Math.min(100, Number(d.form ?? 70) + 4),
      wet: Math.min(99, Number(d.wet ?? 60) + 2),
    };
    await db.from("teams").update({ drivers, budget: team.budget - TRAIN_DRIVER_COST }).eq("id", team.id);
    return { ok: true };
  });

export const trainStaff = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { role: string }) => z.object({ role: z.enum(STAFF_ROLES) }).parse(input))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const team = await ownTeam(db, context.userId);
    if (team.budget < TRAIN_STAFF_COST) throw new Error("Budget reicht nicht.");
    const staff = { ...(team.staff ?? {}) } as Record<string, number>;
    staff[data.role] = Math.min(99, Number(staff[data.role] ?? 40) + 3);
    await db.from("teams").update({ staff, budget: team.budget - TRAIN_STAFF_COST }).eq("id", team.id);
    return { ok: true };
  });

export const signSponsor = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { sponsorId: string }) => z.object({ sponsorId: z.string().min(2).max(40) }).parse(input))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const team = await ownTeam(db, context.userId);
    const sponsor = ONLINE_SPONSORS.find((s) => s.id === data.sponsorId);
    if (!sponsor) throw new Error("Unbekannter Sponsor.");
    const { data: profile } = await db.from("profiles").select("rating").eq("id", context.userId).maybeSingle();
    if ((profile?.rating ?? 1000) < sponsor.minRating) throw new Error("Rating zu niedrig für diesen Sponsor.");
    const marketing = Number((team.hq ?? {}).marketing ?? 1);
    await db
      .from("teams")
      .update({
        sponsor: { id: sponsor.id, name: sponsor.name, perRace: sponsor.perRace + marketing * 15_000 },
        budget: team.budget + sponsor.signing,
      })
      .eq("id", team.id);
    return { ok: true };
  });

export const sendRaceOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { raceId: string; order: string }) =>
    z.object({ raceId: z.string().uuid(), order: z.enum(["push", "normal", "conserve", "pit"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: entry } = await db
      .from("race_entries")
      .select("id,dnf")
      .eq("race_id", data.raceId)
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!entry) throw new Error("Kein Auto in diesem Rennen.");
    if (entry.dnf) throw new Error("Fahrzeug ist ausgefallen.");
    await db.from("race_entries").update({ pending_order: data.order }).eq("id", entry.id);
    return { ok: true };
  });

export const requestFriend = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { username: string }) => z.object({ username: z.string().trim().min(2).max(40) }).parse(input))
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: target } = await db
      .from("profiles")
      .select("id,username")
      .ilike("username", data.username)
      .maybeSingle();
    if (!target) throw new Error("Spieler nicht gefunden.");
    if (target.id === context.userId) throw new Error("Du kannst dich nicht selbst hinzufügen.");
    const { error } = await db
      .from("friendships")
      .upsert({ user_id: context.userId, friend_id: target.id, status: "pending" }, { onConflict: "user_id,friend_id" });
    if (error) throw error;
    return { ok: true, username: target.username };
  });

export const respondFriend = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string; accept: boolean }) =>
    z.object({ id: z.string().uuid(), accept: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { data: row } = await db.from("friendships").select("*").eq("id", data.id).maybeSingle();
    if (!row || (row.user_id !== context.userId && row.friend_id !== context.userId)) throw new Error("Nicht erlaubt.");
    if (data.accept) await db.from("friendships").update({ status: "accepted" }).eq("id", data.id);
    else await db.from("friendships").delete().eq("id", data.id);
    return { ok: true };
  });

export const renameProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { username: string }) =>
    z.object({ username: z.string().trim().min(3).max(24).regex(/^[\w .-]+$/) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const db = await admin();
    const { error } = await db.from("profiles").update({ username: data.username }).eq("id", context.userId);
    if (error) throw new Error("Name schon vergeben.");
    return { ok: true };
  });
