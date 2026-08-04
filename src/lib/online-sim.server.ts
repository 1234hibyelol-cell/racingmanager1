// Serverseitige Rennsimulation: Ligen füllen, Rennen planen, Runde für Runde simulieren.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  LEAGUE_SIZE,
  POINTS_TABLE,
  RACE_MINUTES,
  SEASON_ROUNDS,
  teamStrength,
  type OnlineDriver,
} from "@/game/online/config";
import { trackForRound, WEATHER_ONLINE } from "@/game/online/tracks";

/* eslint-disable @typescript-eslint/no-explicit-any */
const db = () => supabaseAdmin as any;

const BOT_TEAMS = [
  "Scuderia Aurelia", "Nordwind Racing", "Kaskade Motors", "Solaris GP", "Ferro Works",
  "Astra Dynamics", "Monteverde Corse", "Havenport United", "Velocity Labs", "Kobalt Racing",
  "Meridian Sport", "Titanwerk", "Pacifica Speed", "Orion Motorsport", "Vulkan Racing",
  "Brightline GP", "Eisberg Motors", "Delta Aeronautics", "Rubicon Racing", "Zenith Grand Prix",
];
const FIRST = ["Luca", "Mika", "Enzo", "Nils", "Diego", "Aron", "Kai", "Ravi", "Theo", "Milan", "Jonas", "Elias", "Noah", "Ivan", "Marco", "Sami", "Leon", "Tobias", "Rico", "Adem"];
const LAST = ["Vandal", "Ferrini", "Halvorsen", "Okonkwo", "Duarte", "Reinhart", "Sato", "Kovac", "Larsen", "Marchetti", "Brandt", "Oduya", "Petrov", "Lindqvist", "Moreau", "Yildiz", "Bergmann", "Costa", "Novak", "Falk"];
const COLORS = ["#e11d48", "#f59e0b", "#22d3ee", "#a3e635", "#8b5cf6", "#f472b6", "#38bdf8", "#facc15", "#34d399", "#fb7185"];

const rnd = () => Math.random();
const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)]!;

export function makeDriver(quality = 60): OnlineDriver {
  return {
    name: `${pick(FIRST)} ${pick(LAST)}`,
    rating: Math.round(quality + rnd() * 25),
    form: Math.round(60 + rnd() * 40),
    wet: Math.round(45 + rnd() * 50),
  };
}

function driverOf(team: any): OnlineDriver {
  const list = Array.isArray(team.drivers) ? team.drivers : [];
  return (list[0] as OnlineDriver | undefined) ?? makeDriver(55);
}

async function log(raceId: string, lap: number, kind: string, message: string) {
  await db().from("race_events").insert({ race_id: raceId, lap, kind, message });
}

/** Sorgt dafür, dass eine Liga immer 20 Teams hat (Rest = KI-Teams). */
export async function fillLeague(leagueId: string) {
  const { data: teams } = await db().from("teams").select("id,name").eq("league_id", leagueId);
  const existing = (teams ?? []) as { name: string }[];
  const missing = LEAGUE_SIZE - existing.length;
  if (missing <= 0) return;
  const used = new Set(existing.map((t) => t.name));
  const rows: any[] = [];
  for (let i = 0; i < missing; i++) {
    const name = BOT_TEAMS.find((n) => !used.has(n)) ?? `KI Team ${existing.length + i + 1}`;
    used.add(name);
    const q = 50 + rnd() * 25;
    rows.push({
      league_id: leagueId,
      is_bot: true,
      name,
      color: pick(COLORS),
      drivers: [makeDriver(q), makeDriver(q - 8)],
      staff: {
        engineer: Math.round(q), mechanic: Math.round(q), strategist: Math.round(q), designer: Math.round(q),
      },
      research: {
        unlocked: [], points: 0,
        engine: Math.round(rnd() * 25), aero: Math.round(rnd() * 25), chassis: Math.round(rnd() * 25),
        tyres: Math.round(rnd() * 25), reliability: Math.round(rnd() * 25),
      },
      hq: { garage: 1, windTunnel: 1, simulator: 1, academy: 1, marketing: 1 },
    });
  }
  await db().from("teams").insert(rows);
}

/** Neue Liga anlegen und mit KI-Teams füllen. */
export async function createLeague(): Promise<string> {
  const { count } = await db().from("leagues").select("id", { count: "exact", head: true });
  const idx = (count ?? 0) + 1;
  const { data, error } = await db()
    .from("leagues")
    .insert({
      name: `Legends Grid Liga ${idx}`,
      tier: 1,
      next_race_at: new Date(Date.now() + 10 * 60_000).toISOString(),
    })
    .select("id")
    .single();
  if (error) throw error;
  await fillLeague(data.id);
  return data.id as string;
}

/** Liga mit freiem Platz finden oder neue anlegen. */
export async function findOpenLeague(): Promise<string> {
  const { data: leagues } = await db().from("leagues").select("id").order("created_at", { ascending: true });
  for (const l of (leagues ?? []) as { id: string }[]) {
    const { count } = await db()
      .from("teams")
      .select("id", { count: "exact", head: true })
      .eq("league_id", l.id)
      .eq("is_bot", true);
    if ((count ?? 0) > 0) return l.id;
  }
  return createLeague();
}

async function startRace(league: any) {
  const round = league.round + 1;
  const track = trackForRound(round);
  const weather = pick(["sun", "sun", "sun", "rain", "heat", "night", "fog", "storm"]);
  const { data: teams } = await db().from("teams").select("*").eq("league_id", league.id);
  const list = (teams ?? []) as any[];
  if (list.length < 2) return;

  const { data: race, error } = await db()
    .from("races")
    .insert({
      league_id: league.id,
      season: league.season,
      round,
      track_id: track.id,
      track_name: track.name,
      laps: track.laps,
      weather,
      temperature: weather === "heat" ? 34 : weather === "night" ? 16 : 18 + Math.round(rnd() * 12),
      status: "running",
      scheduled_at: new Date().toISOString(),
      started_at: new Date().toISOString(),
    })
    .select("*")
    .single();
  if (error) throw error;

  const grid = list
    .map((t) => {
      const d = driverOf(t);
      return { t, d, q: teamStrength(t) + d.rating * 0.6 + rnd() * 14 };
    })
    .sort((a, b) => b.q - a.q);

  await db().from("race_entries").insert(
    grid.map((g, i) => ({
      race_id: race.id,
      team_id: g.t.id,
      user_id: g.t.user_id,
      team_name: g.t.name,
      driver_name: g.d.name,
      color: g.t.color,
      grid: i + 1,
      position: i + 1,
      total_ms: i * 350,
      mode: g.t.strategy ?? "normal",
    })),
  );

  await db()
    .from("leagues")
    .update({ round, next_race_at: new Date(Date.now() + 60 * 60_000).toISOString() })
    .eq("id", league.id);

  await log(race.id, 0, "start", `Start in ${track.name} – ${WEATHER_ONLINE[weather]!.label}, Pole: ${grid[0]!.t.name}`);
}

async function advanceRace(race: any) {
  const { data: entriesRaw } = await db().from("race_entries").select("*").eq("race_id", race.id);
  const entries = (entriesRaw ?? []) as any[];
  if (!entries.length) return;
  const teamIds = entries.map((e) => e.team_id);
  const { data: teamsRaw } = await db().from("teams").select("*").in("id", teamIds);
  const teams = new Map<string, any>(((teamsRaw ?? []) as any[]).map((t) => [t.id, t]));

  const lapsPerTick = Math.max(1, Math.ceil(race.laps / RACE_MINUTES));
  let weather: string = race.weather;
  let safety = race.safety_car as boolean;
  let lap = race.current_lap as number;
  const events: { lap: number; kind: string; message: string }[] = [];

  for (let step = 0; step < lapsPerTick && lap < race.laps; step++) {
    lap++;
    const before = [...entries].sort((a, b) => a.position - b.position).map((e) => e.team_id);

    if (safety && rnd() < 0.5) {
      safety = false;
      events.push({ lap, kind: "safety", message: "Safety Car eingezogen – das Feld ist wieder frei." });
    } else if (!safety && rnd() < 0.05) {
      safety = true;
      events.push({ lap, kind: "safety", message: "Safety Car! Zwischenfall auf der Strecke, Feld wird zusammengeschoben." });
    }
    if (rnd() < 0.03) {
      const next = pick(["sun", "rain", "storm", "fog"]);
      if (next !== weather) {
        weather = next;
        events.push({ lap, kind: "weather", message: `Wetterwechsel: ${WEATHER_ONLINE[weather]!.label} – Teams reagieren an der Box.` });
      }
    }
    const grip = WEATHER_ONLINE[weather]?.grip ?? 1;

    for (const e of entries) {
      if (e.dnf) continue;
      const team = teams.get(e.team_id);
      const drv = driverOf(team ?? {});
      const strength = teamStrength(team ?? {});
      const reliability = 40 + Number((team?.research ?? {}).reliability ?? 0) + Number((team?.hq ?? {}).garage ?? 1) * 4;

      // Anweisung des Spielers oder KI-Entscheidung anwenden
      let order: string | null = e.pending_order ?? null;
      if (!order && team?.is_bot) {
        if (e.tyre < 32) order = "pit";
        else if (rnd() < 0.08) order = pick(["push", "conserve", "normal"]);
      }
      if (order === "pit") {
        e.tyre = 100;
        e.pit_count += 1;
        e.total_ms += safety ? 16_000 : 21_500 - Number((team?.hq ?? {}).garage ?? 1) * 250;
        events.push({ lap, kind: "pit", message: `${e.driver_name} (${e.team_name}) an der Box – Stopp ${e.pit_count}.` });
        e.mode = "normal";
      } else if (order) {
        e.mode = order;
        if (!team?.is_bot) {
          events.push({ lap, kind: "order", message: `${e.team_name}: Anweisung „${order === "push" ? "Angriff" : order === "conserve" ? "Schonen" : "Normal"}“ an ${e.driver_name}.` });
        }
      }
      e.pending_order = null;

      const wetSkill = weather === "rain" || weather === "storm" ? drv.wet : 70;
      const pace = strength * 0.55 + drv.rating * 0.4 + drv.form * 0.05 + wetSkill * 0.06;
      const modeFactor = e.mode === "push" ? 0.988 : e.mode === "conserve" ? 1.014 : 1;
      const tyrePenalty = (100 - e.tyre) * 22;
      let lapMs = (96_000 - pace * 190) * modeFactor / grip + tyrePenalty + (rnd() - 0.5) * 900;
      if (safety) lapMs *= 1.32;
      lapMs = Math.max(45_000, Math.round(lapMs));

      const wear = (e.mode === "push" ? 4.4 : e.mode === "conserve" ? 1.8 : 3) * (safety ? 0.4 : 1) * (weather === "heat" ? 1.25 : 1);
      e.tyre = Math.max(0, Math.round(e.tyre - wear));

      let risk = 0.0010 + (100 - reliability) * 0.00004 + (e.mode === "push" ? 0.0022 : 0) + (e.tyre < 12 ? 0.004 : 0);
      if (weather === "storm") risk += 0.0015;
      if (safety) risk *= 0.4;
      if (rnd() < risk) {
        e.dnf = true;
        events.push({ lap, kind: "dnf", message: `Ausfall! ${e.driver_name} (${e.team_name}) muss das Rennen beenden.` });
        continue;
      }

      e.last_lap_ms = lapMs;
      e.total_ms += lapMs;
      e.laps_done = lap;
    }

    // Positionen neu berechnen
    entries.sort((a, b) => {
      if (a.dnf !== b.dnf) return a.dnf ? 1 : -1;
      if (a.laps_done !== b.laps_done) return b.laps_done - a.laps_done;
      return a.total_ms - b.total_ms;
    });
    const leader = entries[0];
    entries.forEach((e, i) => {
      e.position = i + 1;
      e.gap_ms = e.dnf ? 0 : Math.max(0, e.total_ms - (leader?.total_ms ?? 0));
    });

    const after = entries.map((e) => e.team_id);
    for (let i = 0; i < Math.min(6, after.length); i++) {
      const gained = before.indexOf(after[i]!) > i;
      if (gained && rnd() < 0.5) {
        const e = entries[i]!;
        events.push({ lap, kind: "overtake", message: `Überholmanöver: ${e.driver_name} (${e.team_name}) ist jetzt P${i + 1}.` });
      }
    }
  }

  const finished = lap >= race.laps;
  if (finished) {
    const classified = entries.filter((e) => !e.dnf);
    classified.forEach((e, i) => {
      e.points = POINTS_TABLE[i] ?? 0;
    });
    entries.filter((e) => e.dnf).forEach((e) => (e.points = 0));
  }

  await db().from("race_entries").upsert(
    entries.map((e) => ({
      id: e.id,
      race_id: e.race_id,
      team_id: e.team_id,
      user_id: e.user_id,
      team_name: e.team_name,
      driver_name: e.driver_name,
      color: e.color,
      grid: e.grid,
      position: e.position,
      laps_done: e.laps_done,
      total_ms: Math.round(e.total_ms),
      gap_ms: Math.round(e.gap_ms),
      last_lap_ms: Math.round(e.last_lap_ms),
      tyre: e.tyre,
      pit_count: e.pit_count,
      dnf: e.dnf,
      points: e.points,
      pending_order: null,
      mode: e.mode,
    })),
  );

  if (events.length) {
    await db().from("race_events").insert(
      events.slice(-25).map((ev) => ({ race_id: race.id, lap: ev.lap, kind: ev.kind, message: ev.message })),
    );
  }

  await db()
    .from("races")
    .update({
      current_lap: lap,
      weather,
      safety_car: safety,
      status: finished ? "finished" : "running",
      finished_at: finished ? new Date().toISOString() : null,
    })
    .eq("id", race.id);

  if (finished) await settleRace(race, entries, teams);
}

async function settleRace(race: any, entries: any[], teams: Map<string, any>) {
  for (const e of entries) {
    const team = teams.get(e.team_id);
    if (!team) continue;
    const prize = e.dnf ? 60_000 : (21 - e.position) * 45_000 + e.points * 20_000;
    const sponsor = Number((team.sponsor ?? {}).perRace ?? 0);
    await db()
      .from("teams")
      .update({
        points: team.points + e.points,
        wins: team.wins + (e.position === 1 && !e.dnf ? 1 : 0),
        budget: team.budget + prize + sponsor - 250_000,
      })
      .eq("id", team.id);

    if (e.user_id) {
      const { data: prof } = await db().from("profiles").select("rating,xp").eq("id", e.user_id).maybeSingle();
      if (prof) {
        const delta = e.dnf ? -6 : Math.round((10.5 - Math.min(20, e.position)) * 2);
        await db()
          .from("profiles")
          .update({ rating: Math.max(600, prof.rating + delta), xp: prof.xp + e.points * 12 + 25 })
          .eq("id", e.user_id);
      }
    }
  }
  const winner = entries.find((e) => e.position === 1 && !e.dnf);
  await log(race.id, race.laps, "finish", `Zielflagge! Sieger: ${winner?.driver_name ?? "—"} (${winner?.team_name ?? "—"}).`);

  if (race.round >= SEASON_ROUNDS) await endSeason(race.league_id, race.season);
}

async function endSeason(leagueId: string, season: number) {
  const { data: teamsRaw } = await db().from("teams").select("*").eq("league_id", leagueId);
  const list = ((teamsRaw ?? []) as any[]).sort((a, b) => b.points - a.points);
  await db().from("season_results").insert(
    list.map((t, i) => ({
      league_id: leagueId,
      season,
      team_id: t.id,
      user_id: t.user_id,
      team_name: t.name,
      position: i + 1,
      points: t.points,
    })),
  );
  for (const t of list) {
    await db().from("teams").update({ points: 0, budget: t.budget + 1_500_000 }).eq("id", t.id);
  }
  await db().from("leagues").update({ season: season + 1, round: 0 }).eq("id", leagueId);
}

/** Haupt-Tick: wird minütlich vom Zeitplan aufgerufen. */
export async function runTick() {
  const nowIso = new Date().toISOString();
  const { data: leagues } = await db().from("leagues").select("*");
  const result = { started: 0, advanced: 0 };

  for (const league of (leagues ?? []) as any[]) {
    await fillLeague(league.id);
    const { data: running } = await db()
      .from("races")
      .select("*")
      .eq("league_id", league.id)
      .eq("status", "running")
      .order("round", { ascending: false })
      .limit(1);
    const active = (running ?? [])[0];
    if (active) {
      await advanceRace(active);
      result.advanced++;
      continue;
    }
    if (league.next_race_at <= nowIso) {
      await startRace(league);
      result.started++;
    }
  }
  return result;
}
