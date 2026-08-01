// Spiel-Engine: Erzeugung, Wirtschaft, Entwicklung, Rennsimulation.
// Alle Funktionen sind pur bzw. arbeiten auf einer Kopie -> leicht testbar & erweiterbar.
import {
  AI_TEAM_DEFS,
  COUNTRIES,
  DIFFICULTY,
  FIRST_NAMES,
  LAST_NAMES,
  POINTS,
  SPONSOR_NAMES,
  TRACKS,
} from "./data";
import { SAVE_VERSION } from "./save";
import type {
  BuildingKey,
  Car,
  Difficulty,
  Driver,
  DriverSkills,
  GameState,
  PartKey,
  RaceRecord,
  RaceResultRow,
  ResearchKey,
  Sponsor,
  Strategy,
  Team,
} from "./types";

/* ---------- Helfer ---------- */
export const rnd = (min: number, max: number) => Math.random() * (max - min) + min;
export const rndInt = (min: number, max: number) => Math.floor(rnd(min, max + 1));
export const pick = <T,>(arr: readonly T[]): T => arr[rndInt(0, arr.length - 1)]!;
export const clamp = (v: number, a = 1, b = 99) => Math.max(a, Math.min(b, v));
export const money = (n: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

let idCounter = 0;
const uid = (p: string) => `${p}_${Date.now().toString(36)}_${(idCounter++).toString(36)}`;

const PARTS: PartKey[] = ["engine", "chassis", "aero", "gearbox", "tyres", "brakes"];
const RESEARCH: ResearchKey[] = ["engineDev", "aeroDev", "tyreDev", "reliabilityDev", "strategyDev"];
const BUILDINGS: BuildingKey[] = ["garage", "lab", "simulator", "workshop"];

/* ---------- Fahrer ---------- */
function makeSkills(base: number): DriverSkills {
  const s = (spread = 12) => clamp(Math.round(base + rnd(-spread, spread)));
  return {
    speed: s(),
    cornering: s(),
    braking: s(),
    overtaking: s(),
    defending: s(),
    wet: s(),
    consistency: s(),
    raceIQ: s(),
    experience: clamp(Math.round(base * 0.8 + rnd(-15, 15))),
    talent: clamp(Math.round(rnd(35, 95))),
  };
}

export function driverRating(d: Driver): number {
  const s = d.skills;
  return Math.round(
    (s.speed * 1.4 +
      s.cornering * 1.3 +
      s.braking +
      s.overtaking +
      s.defending * 0.8 +
      s.wet * 0.6 +
      s.consistency * 1.2 +
      s.raceIQ * 1.1 +
      s.experience * 0.6) /
      9,
  );
}

export function createDriver(baseSkill = rnd(40, 85)): Driver {
  const name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
  const skills = makeSkills(baseSkill);
  const d: Driver = {
    id: uid("drv"),
    name,
    age: rndInt(18, 38),
    nationality: pick(COUNTRIES),
    portrait: name.split(" ").map((p) => p[0]).join(""),
    salary: 0,
    marketValue: 0,
    skills,
    teamId: null,
    contractSeasons: 0,
    stats: { starts: 0, wins: 0, podiums: 0, poles: 0, points: 0, championships: 0 },
  };
  const r = driverRating(d);
  d.marketValue = Math.round((r ** 2.6) / 90) * 1000;
  d.salary = Math.round(d.marketValue / 12 / 1000) * 1000 + 60_000;
  return d;
}

/* ---------- Auto / Forschung / Gebäude ---------- */
function createCar(name: string): Car {
  const parts = {} as Car["parts"];
  for (const p of PARTS) {
    parts[p] = { level: 1, performance: rndInt(28, 38), reliability: rndInt(55, 70) };
  }
  return { name, parts };
}

export function carPerformance(state: GameState): number {
  const p = state.team.car.parts;
  const avg = PARTS.reduce((sum, k) => sum + p[k].performance, 0) / PARTS.length;
  const res = state.team.research;
  const bonus = (res.engineDev.level + res.aeroDev.level + res.tyreDev.level) * 1.2;
  return clamp(avg + bonus, 1, 100);
}

export function carReliability(state: GameState): number {
  const p = state.team.car.parts;
  const avg = PARTS.reduce((sum, k) => sum + p[k].reliability, 0) / PARTS.length;
  const bonus =
    state.team.research.reliabilityDev.level * 2 +
    state.team.buildings.workshop.level * 1.5 +
    state.team.buildings.garage.level;
  return clamp(avg + bonus, 1, 99);
}

export function upgradeCost(state: GameState, part: PartKey): number {
  const level = state.team.car.parts[part].level;
  return Math.round(180_000 * level ** 1.5 * DIFFICULTY[state.difficulty].costFactor);
}

export function researchCost(state: GameState, key: ResearchKey): number {
  const level = state.team.research[key].level;
  return Math.round(250_000 * (level + 1) ** 1.4 * DIFFICULTY[state.difficulty].costFactor);
}

export function buildingCost(state: GameState, key: BuildingKey): number {
  const level = state.team.buildings[key].level;
  return Math.round(400_000 * level ** 1.6 * DIFFICULTY[state.difficulty].costFactor);
}

export function trainingCost(state: GameState): number {
  return Math.round(80_000 * DIFFICULTY[state.difficulty].costFactor);
}

/* ---------- Sponsoren ---------- */
export function createSponsor(): Sponsor {
  const reqRoll = rndInt(0, 2);
  const requirement =
    reqRoll === 0
      ? { type: "top10" as const, value: 1, label: "Ein Top-10-Ergebnis pro Rennen" }
      : reqRoll === 1
        ? { type: "win" as const, value: 1, label: "Mindestens 1 Saisonsieg" }
        : { type: "points" as const, value: rndInt(40, 120), label: `Punkte in der Saison sammeln` };
  const tier = rnd(0.7, 1.6);
  return {
    id: uid("spn"),
    name: pick(SPONSOR_NAMES),
    perRace: Math.round(120_000 * tier),
    signingBonus: Math.round(400_000 * tier),
    seasons: 1,
    requirement,
    reward: Math.round(900_000 * tier),
  };
}

/* ---------- Neues Spiel ---------- */
export interface NewGameOptions {
  teamName: string;
  logo: string;
  color: string;
  country: string;
  style: Team["style"];
  difficulty: Difficulty;
}

export function createNewGame(opts: NewGameOptions): GameState {
  const drivers: Record<string, Driver> = {};
  const all: Driver[] = [];
  for (let i = 0; i < 200; i++) {
    const d = createDriver(rnd(35, 88));
    drivers[d.id] = d;
    all.push(d);
  }
  all.sort((a, b) => driverRating(b) - driverRating(a));

  const aiTeams = AI_TEAM_DEFS.map((def, i) => {
    const id = `ai_${i}`;
    const roster = all.slice(i * 2, i * 2 + 2);
    roster.forEach((d) => {
      d.teamId = id;
      d.contractSeasons = rndInt(1, 3);
    });
    return {
      id,
      name: def.name,
      color: def.color,
      strength: Math.round(88 - i * 4 + rnd(-2, 2)),
      driverIds: roster.map((d) => d.id),
    };
  });

  // Spieler startet mit zwei schwächeren Fahrern
  const rookies = all.slice(-40).sort(() => Math.random() - 0.5).slice(0, 2);
  rookies.forEach((d) => {
    d.teamId = "player";
    d.contractSeasons = 2;
  });

  const budget =
    DIFFICULTY[opts.difficulty].budget * (opts.style === "engineering" ? 0.85 : 1);

  const team: Team = {
    name: opts.teamName,
    logo: opts.logo,
    color: opts.color,
    country: opts.country,
    style: opts.style,
    reputation: 20,
    money: Math.round(budget),
    car: createCar(`${opts.teamName} LG-01`),
    research: RESEARCH.reduce(
      (acc, k) => ({ ...acc, [k]: { level: 0, progress: 0, active: false } }),
      {} as Team["research"],
    ),
    buildings: BUILDINGS.reduce((acc, k) => ({ ...acc, [k]: { level: 1 } }), {} as Team["buildings"]),
    driverIds: rookies.map((d) => d.id),
    lineup: [rookies[0]?.id ?? null, rookies[1]?.id ?? null],
    sponsorIds: [],
    stats: { wins: 0, podiums: 0, poles: 0, points: 0, championships: 0, seasonsPlayed: 0 },
    history: [`${new Date().getFullYear()}: Team ${opts.teamName} gegründet.`],
  };

  return {
    version: SAVE_VERSION,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    difficulty: opts.difficulty,
    team,
    aiTeams,
    drivers,
    freeAgents: all.filter((d) => !d.teamId).map((d) => d.id),
    season: {
      year: 2026,
      round: 0,
      calendar: TRACKS.map((t) => t.id),
      standings: {},
      teamStandings: {},
      races: [],
      trainingDone: false,
      qualiDone: false,
      lastQualifying: null,
    },
    availableSponsors: Array.from({ length: 4 }, createSponsor),
    aiStrengthModifier: DIFFICULTY[opts.difficulty].aiStrength,
  };
}

/* ---------- Rennsimulation ---------- */
interface Entrant {
  driverId: string;
  driverName: string;
  teamId: string;
  teamName: string;
  teamColor: string;
  pace: number;
  reliability: number;
}

const STRATEGY_MOD: Record<Strategy, { pace: number; risk: number }> = {
  aggressive: { pace: 4, risk: 0.06 },
  normal: { pace: 0, risk: 0 },
  safe: { pace: -2.5, risk: -0.03 },
};

function buildField(state: GameState, strategy: Strategy, trackId: string): Entrant[] {
  const track = TRACKS.find((t) => t.id === trackId)!;
  const field: Entrant[] = [];
  const carPerf = carPerformance(state);
  const carRel = carReliability(state);
  const stratBonus = state.team.research.strategyDev.level * 1.2;
  const aggro = state.team.style === "aggressive" ? 2 : 0;

  for (const id of state.team.lineup) {
    if (!id) continue;
    const d = state.drivers[id];
    if (!d) continue;
    const s = d.skills;
    const driverPace =
      s.speed * track.power + s.cornering * track.corners + s.braking * track.brakes;
    field.push({
      driverId: d.id,
      driverName: d.name,
      teamId: "player",
      teamName: state.team.name,
      teamColor: state.team.color,
      pace:
        driverPace * 0.5 +
        carPerf * 0.5 +
        s.raceIQ * 0.08 +
        STRATEGY_MOD[strategy].pace +
        stratBonus +
        aggro,
      reliability: carRel - STRATEGY_MOD[strategy].risk * 100 - (aggro ? 3 : 0),
    });
  }

  for (const ai of state.aiTeams) {
    for (const id of ai.driverIds) {
      const d = state.drivers[id];
      if (!d) continue;
      const s = d.skills;
      const driverPace =
        s.speed * track.power + s.cornering * track.corners + s.braking * track.brakes;
      field.push({
        driverId: d.id,
        driverName: d.name,
        teamId: ai.id,
        teamName: ai.name,
        teamColor: ai.color,
        pace: (driverPace * 0.5 + ai.strength * 0.5) * state.aiStrengthModifier,
        reliability: clamp(ai.strength * 0.85 + 12, 40, 96),
      });
    }
  }
  return field;
}

export function simulateQualifying(
  state: GameState,
  strategy: Strategy,
): { driverId: string; position: number; driverName: string; teamName: string; teamColor: string }[] {
  const field = buildField(state, strategy, state.season.calendar[state.season.round]!);
  return field
    .map((e) => ({ ...e, q: e.pace + rnd(-6, 6) }))
    .sort((a, b) => b.q - a.q)
    .map((e, i) => ({
      driverId: e.driverId,
      position: i + 1,
      driverName: e.driverName,
      teamName: e.teamName,
      teamColor: e.teamColor,
    }));
}

export interface RaceOutcome {
  record: RaceRecord;
  log: string[];
}

export function simulateRace(state: GameState, strategy: Strategy): RaceOutcome {
  const trackId = state.season.calendar[state.season.round]!;
  const track = TRACKS.find((t) => t.id === trackId)!;
  const field = buildField(state, strategy, trackId);
  const grid = new Map<string, number>();
  const quali = state.season.lastQualifying ?? simulateQualifying(state, strategy);
  quali.forEach((q) => grid.set(q.driverId, q.position));
  field.forEach((e, i) => {
    if (!grid.has(e.driverId)) grid.set(e.driverId, i + 1);
  });

  const log: string[] = [`Start in ${track.name} · ${track.laps} Runden`];
  const rows = field.map((e) => {
    const startPos = grid.get(e.driverId) ?? 20;
    const gridBonus = (20 - startPos) * 0.35;
    const dnf = rnd(0, 100) > e.reliability + 12;
    const score = e.pace + gridBonus + rnd(-7, 7);
    return { e, startPos, dnf, score };
  });

  const finishers = rows.filter((r) => !r.dnf).sort((a, b) => b.score - a.score);
  const dnfs = rows.filter((r) => r.dnf);
  const fastest = finishers[0];

  const results: RaceResultRow[] = [
    ...finishers.map((r, i) => ({
      driverId: r.e.driverId,
      driverName: r.e.driverName,
      teamId: r.e.teamId,
      teamName: r.e.teamName,
      teamColor: r.e.teamColor,
      grid: r.startPos,
      position: i + 1,
      points: POINTS[i] ?? 0,
      dnf: false,
      fastestLap: r === fastest,
    })),
    ...dnfs.map((r) => ({
      driverId: r.e.driverId,
      driverName: r.e.driverName,
      teamId: r.e.teamId,
      teamName: r.e.teamName,
      teamColor: r.e.teamColor,
      grid: r.startPos,
      position: null,
      points: 0,
      dnf: true,
      fastestLap: false,
    })),
  ];

  const winner = results[0];
  if (winner) log.push(`Runde 1: ${winner.driverName} übernimmt die Führung.`);
  dnfs.slice(0, 3).forEach((r) =>
    log.push(`Ausfall: ${r.e.driverName} (${r.e.teamName}) – technischer Defekt.`),
  );
  const player = results.filter((r) => r.teamId === "player");
  player.forEach((p) =>
    log.push(
      p.dnf
        ? `${p.driverName} scheidet aus (Start P${p.grid}).`
        : `${p.driverName}: P${p.grid} → P${p.position} (${p.points} Punkte).`,
    ),
  );
  if (winner) log.push(`Zielflagge: Sieg für ${winner.driverName} (${winner.teamName}).`);

  return {
    record: { round: state.season.round + 1, trackId, trackName: track.name, results },
    log,
  };
}

/* ---------- Wirtschaft ---------- */
export function raceIncome(state: GameState, results: RaceResultRow[]): { sponsors: number; prize: number } {
  const sponsors = state.team.sponsorIds.reduce((sum, id) => {
    const s = state.availableSponsors.find((x) => x.id === id);
    return sum + (s?.perRace ?? 150_000);
  }, 0);
  const prize = results
    .filter((r) => r.teamId === "player")
    .reduce((sum, r) => sum + (r.position ? Math.max(60_000, 900_000 - (r.position - 1) * 70_000) : 40_000), 0);
  return { sponsors, prize };
}

export function weeklyCosts(state: GameState): number {
  const salaries = state.team.driverIds.reduce((s, id) => s + (state.drivers[id]?.salary ?? 0) / 12, 0);
  const facilities = Object.values(state.team.buildings).reduce((s, b) => s + b.level * 40_000, 0);
  return Math.round(salaries + facilities);
}

export { PARTS, RESEARCH, BUILDINGS };
