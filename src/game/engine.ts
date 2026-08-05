// Spiel-Engine: Erzeugung, Wirtschaft, Entwicklung, Wetter, Rennsimulation.
import {
  AI_TEAM_DEFS,
  CHAMPIONSHIP_TEMPLATES,
  COUNTRIES,
  DESIGN_COLORS,
  DIFFICULTY,
  EVENT_TEMPLATES,
  FIRST_NAMES,
  GARAGE_STYLES,
  HELMET_PATTERNS,
  HQ_STYLES,
  LAST_NAMES,
  LIVERY_PATTERNS,
  PERSONALITIES,
  POINTS,
  SPONSOR_NAMES,
  SPONSOR_PLACEMENTS,
  TRACKS,
  WEATHER_LABELS,
  type TrackDef,
} from "./data";
import { SAVE_VERSION } from "./version";
import type {
  BuildingKey,
  Car,
  Championship,
  CustomTrack,
  DevelopmentState,
  Difficulty,
  Driver,
  DriverSkills,
  DriverTraits,
  FinanceState,
  GameState,
  MediaState,
  PartKey,
  PlayerProfile,
  PremiumState,
  RaceRecord,
  RaceResultRow,
  ResearchKey,
  SeasonEvent,
  Sponsor,
  Staff,
  StaffRole,
  Strategy,
  Team,
  TeamDesign,
  WeatherKind,
  WeatherState,
  WorldState,
} from "./types";

/* ---------- Helfer ---------- */
export const rnd = (min: number, max: number) => Math.random() * (max - min) + min;
export const rndInt = (min: number, max: number) => Math.floor(rnd(min, max + 1));
export const pick = <T,>(arr: readonly T[]): T => arr[rndInt(0, arr.length - 1)]!;
export const clamp = (v: number, a = 1, b = 99) => Math.max(a, Math.min(b, v));
export const money = (n: number) =>
  new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

let idCounter = 0;
export const uid = (p: string) => `${p}_${Date.now().toString(36)}_${(idCounter++).toString(36)}`;

const PARTS: PartKey[] = [
  "engine", "chassis", "aero", "gearbox", "tyres", "brakes",
  "frontWing", "rearWing", "floor", "battery", "cooling", "suspension", "electronics",
];
const RESEARCH: ResearchKey[] = ["engineDev", "aeroDev", "tyreDev", "reliabilityDev", "strategyDev"];
const BUILDINGS: BuildingKey[] = [
  "garage", "lab", "simulator", "workshop", "windTunnel",
  "kartSchool", "juniorTeam", "talentCenter", "youthSimulator",
];
const STAFF_ROLES: StaffRole[] = ["engineer", "mechanic", "strategist", "designer"];

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

export function makeTraits(): DriverTraits {
  return {
    personality: pick(PERSONALITIES),
    motivation: rndInt(45, 95),
    confidence: rndInt(40, 90),
    pressure: rndInt(35, 95),
    popularity: rndInt(10, 70),
    loyalty: rndInt(25, 95),
    aggression: rndInt(20, 95),
    mediaSkill: rndInt(20, 90),
  };
}

export function makeGear(color?: string): Driver["gear"] {
  return {
    helmet: color ?? pick(DESIGN_COLORS),
    helmetPattern: pick(HELMET_PATTERNS),
    suit: pick(DESIGN_COLORS),
    gloves: pick(DESIGN_COLORS),
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

/** Lebensphase aus Alter & Höhepunkt ableiten. */
export function driverStage(d: Driver): Driver["stage"] {
  if (d.retired) return "retired";
  if (d.age <= 20) return "prospect";
  if (d.age < d.peakAge - 3) return "rising";
  if (d.age <= d.peakAge + 2) return "prime";
  if (d.age <= d.peakAge + 6) return "veteran";
  return "declining";
}

export const STAGE_LABELS: Record<Driver["stage"], string> = {
  prospect: "Talent",
  rising: "Aufsteigend",
  prime: "Höhepunkt",
  veteran: "Routinier",
  declining: "Abstieg",
  retired: "Im Ruhestand",
};

export function createDriver(baseSkill = rnd(40, 85), opts: { age?: number; academy?: boolean } = {}): Driver {
  const name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
  const skills = makeSkills(baseSkill);
  const d: Driver = {
    id: uid("drv"),
    name,
    age: opts.age ?? rndInt(18, 38),
    nationality: pick(COUNTRIES),
    portrait: name.split(" ").map((p) => p[0]).join(""),
    salary: 0,
    marketValue: 0,
    skills,
    teamId: null,
    contractSeasons: 0,
    stats: { starts: 0, wins: 0, podiums: 0, poles: 0, points: 0, championships: 0 },
    traits: makeTraits(),
    stage: "rising",
    peakAge: rndInt(26, 32),
    form: rndInt(45, 85),
    rivalIds: [],
    friendIds: [],
    retired: false,
    legend: false,
    academy: opts.academy ?? false,
    gear: makeGear(),
  };
  d.stage = driverStage(d);
  const r = driverRating(d);
  d.marketValue = Math.round((r ** 2.6) / 90) * 1000;
  d.salary = Math.round(d.marketValue / 12 / 1000) * 1000 + 60_000;
  return d;
}

/* ---------- Personal ---------- */
export function createStaff(role: StaffRole, base = rnd(40, 88)): Staff {
  const skill = clamp(Math.round(base + rnd(-8, 8)));
  const age = rndInt(26, 62);
  return {
    id: uid("stf"),
    name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
    age,
    role,
    experience: clamp(Math.round((age - 24) * 2.4 + rnd(-10, 12))),
    skill,
    salary: Math.round((skill ** 1.9) * 12) + 40_000,
    personality: pick(PERSONALITIES),
    teamId: null,
  };
}

/** Durchschnittliche Stärke aller Mitarbeiter einer Rolle (0..100). */
export function staffPower(state: GameState, role: StaffRole): number {
  const list = state.team.staffIds
    .map((id) => state.staff[id])
    .filter((s): s is Staff => !!s && s.role === role);
  if (!list.length) return 0;
  const avg = list.reduce((sum, s) => sum + s.skill * 0.75 + s.experience * 0.25, 0) / list.length;
  return Math.round(avg * Math.min(1.25, 0.75 + list.length * 0.25));
}

/* ---------- Auto / Forschung / Gebäude ---------- */
export function createCar(name: string): Car {
  const parts = {} as Car["parts"];
  for (const p of PARTS) {
    parts[p] = { level: 1, performance: rndInt(28, 38), reliability: rndInt(55, 70) };
  }
  return { name, parts };
}

export function carPerformance(state: GameState): number {
  const p = state.team.car.parts;
  const keys = PARTS.filter((k) => p[k]);
  const avg = keys.reduce((sum, k) => sum + p[k]!.performance, 0) / Math.max(1, keys.length);
  const res = state.team.research;
  const bonus = (res.engineDev.level + res.aeroDev.level + res.tyreDev.level) * 1.2;
  const staffBonus = (staffPower(state, "engineer") + staffPower(state, "designer")) / 40;
  const dev = state.team.development;
  const devBonus = (dev.windTunnelData + dev.simulationData) / 40 + Math.min(6, dev.testKm / 500);
  const flawPenalty = dev.flaws.reduce((s, f) => s + f.penalty, 0);
  return clamp(avg + bonus + staffBonus + devBonus - flawPenalty, 1, 100);
}

export function carReliability(state: GameState): number {
  const p = state.team.car.parts;
  const keys = PARTS.filter((k) => p[k]);
  const avg = keys.reduce((sum, k) => sum + p[k]!.reliability, 0) / Math.max(1, keys.length);
  const bonus =
    state.team.research.reliabilityDev.level * 2 +
    state.team.buildings.workshop.level * 1.5 +
    state.team.buildings.garage.level +
    staffPower(state, "mechanic") / 20;
  const flaws = state.team.development.flaws.length * 2;
  return clamp(avg + bonus - flaws, 1, 99);
}

export function upgradeCost(state: GameState, part: PartKey): number {
  const level = state.team.car.parts[part]?.level ?? 1;
  return Math.round(180_000 * level ** 1.5 * DIFFICULTY[state.difficulty].costFactor);
}

export function researchCost(state: GameState, key: ResearchKey): number {
  const level = state.team.research[key].level;
  return Math.round(250_000 * (level + 1) ** 1.4 * DIFFICULTY[state.difficulty].costFactor);
}

export function buildingCost(state: GameState, key: BuildingKey): number {
  const level = state.team.buildings[key]?.level ?? 1;
  return Math.round(400_000 * level ** 1.6 * DIFFICULTY[state.difficulty].costFactor);
}

export function trainingCost(state: GameState): number {
  return Math.round(80_000 * DIFFICULTY[state.difficulty].costFactor);
}

export type DevAction = "windTunnel" | "simulation" | "prototype" | "testDrive" | "reliabilityTest";

export const DEV_LABELS: Record<DevAction, { label: string; desc: string; cost: number }> = {
  windTunnel: { label: "Windkanaltest", desc: "Aero-Daten sammeln (+Windkanaldaten)", cost: 320_000 },
  simulation: { label: "Simulation", desc: "Rechnerische Auslegung (+Simulationsdaten)", cost: 180_000 },
  prototype: { label: "Prototyp bauen", desc: "Bauteil-Prototyp aus gesammelten Daten", cost: 650_000 },
  testDrive: { label: "Testfahrt", desc: "Testkilometer & Setup verbessern", cost: 240_000 },
  reliabilityTest: { label: "Zuverlässigkeitstest", desc: "Findet und behebt Entwicklungsfehler", cost: 300_000 },
};

export function devCost(state: GameState, action: DevAction): number {
  return Math.round(DEV_LABELS[action].cost * DIFFICULTY[state.difficulty].costFactor);
}

/* ---------- Sponsoren ---------- */
const SPONSOR_TIERS: { tier: SponsorTier; label: string; factor: number; minReputation: number; minWins: number; weight: number }[] = [
  { tier: "regional", label: "Regional", factor: 0.55, minReputation: 0, minWins: 0, weight: 4 },
  { tier: "solide", label: "Solide", factor: 1, minReputation: 25, minWins: 0, weight: 3 },
  { tier: "premium", label: "Premium", factor: 1.7, minReputation: 50, minWins: 1, weight: 2 },
  { tier: "global", label: "Global", factor: 2.6, minReputation: 70, minWins: 3, weight: 1 },
];

export const SPONSOR_TIER_LABELS: Record<SponsorTier, string> = {
  regional: "Regional",
  solide: "Solide",
  premium: "Premium",
  global: "Global",
};

export function createSponsor(): Sponsor {
  const reqRoll = rndInt(0, 2);
  const requirement =
    reqRoll === 0
      ? { type: "top10" as const, value: 1, label: "Ein Top-10-Ergebnis pro Rennen" }
      : reqRoll === 1
        ? { type: "win" as const, value: 1, label: "Mindestens 1 Saisonsieg" }
        : { type: "points" as const, value: rndInt(40, 120), label: `Punkte in der Saison sammeln` };
  const pool = SPONSOR_TIERS.flatMap((t) => Array.from({ length: t.weight }, () => t));
  const tierInfo = pick(pool);
  const tier = rnd(0.85, 1.2) * tierInfo.factor;
  return {
    id: uid("spn"),
    name: pick(SPONSOR_NAMES),
    perRace: Math.round(120_000 * tier),
    signingBonus: Math.round(400_000 * tier),
    seasons: 1,
    requirement,
    reward: Math.round(900_000 * tier),
    tier: tierInfo.tier,
    minReputation: tierInfo.minReputation,
    minWins: tierInfo.minWins,
  };
}


/* ---------- Strecken & Wetter ---------- */
export function allTracks(state: GameState | null): TrackDef[] {
  const custom = (state?.customTracks ?? []).map((t) => ({ ...t }) as unknown as TrackDef);
  return [...TRACKS, ...custom];
}

export function getTrack(state: GameState, id: string): TrackDef {
  return allTracks(state).find((t) => t.id === id) ?? TRACKS[0]!;
}

export function rollWeather(track: TrackDef): WeatherKind {
  if (track.kind === "night") return Math.random() < track.rainChance ? "rain" : "night";
  const roll = Math.random();
  if (roll < track.rainChance * 0.65) return "rain";
  if (roll < track.rainChance * 0.8) return "storm";
  if (roll < track.rainChance * 0.95) return "fog";
  if (track.kind === "desert" && roll > 0.55) return "heat";
  return "sun";
}

export function makeWeather(track: TrackDef): WeatherState {
  const kind = rollWeather(track);
  return {
    kind,
    temperature: kind === "heat" ? rndInt(34, 45) : kind === "rain" || kind === "storm" ? rndInt(11, 19) : rndInt(18, 30),
    gripFactor: WEATHER_LABELS[kind].grip,
    forecast: [kind, rollWeather(track), rollWeather(track)],
    locked: false,
  };
}

/* ---------- Default-Fabriken (auch für Save-Migration) ---------- */
export function defaultDevelopment(): DevelopmentState {
  return { windTunnelData: 0, simulationData: 0, testKm: 0, prototypes: [], flaws: [], setup: 40 };
}

export function defaultDesign(color = "#e0332f", logo = "🏁"): TeamDesign {
  return {
    primary: color,
    secondary: "#1f2933",
    pattern: LIVERY_PATTERNS[0]!,
    logo,
    sponsorPlacement: SPONSOR_PLACEMENTS[0]!,
    raceNumber: rndInt(2, 88),
    garage: GARAGE_STYLES[0]!,
    headquarters: HQ_STYLES[0]!,
    uiTheme: "Racing Red",
  };
}

export function defaultFinance(): FinanceState {
  return {
    tvDeal: 400_000,
    merchLevel: 1,
    ticketLevel: 1,
    investors: 0,
    marketing: 1,
    factory: 1,
    travelCost: 180_000,
    lastReport: null,
  };
}

export function defaultMedia(): MediaState {
  return { pending: [], feed: [], fanbase: 20_000 };
}

export function defaultWorld(): WorldState {
  return {
    news: [],
    archive: [],
    records: {
      mostWins: { name: "–", value: 0 },
      mostTitles: { name: "–", value: 0 },
      mostPoints: { name: "–", value: 0 },
      bestTeam: { name: "–", value: 0 },
    },
    legends: [],
    generation: 1,
  };
}

export function defaultProfile(teamName = "Spieler"): PlayerProfile {
  return {
    id: uid("prf"),
    name: teamName,
    level: 1,
    xp: 0,
    rating: 1200,
    friends: [
      { id: "f1", name: "GridRookie", rating: 1180 },
      { id: "f2", name: "ApexHunter", rating: 1320 },
      { id: "f3", name: "SlipstreamSam", rating: 1245 },
    ],
    clubs: [{ id: "c1", name: "Legends Grid Club", members: 128 }],
    achievements: [],
  };
}

export function defaultPremium(): PremiumState {
  return { credits: 500, owned: [], saveSlots: 4, advancedStats: false, theme: "Racing Red" };
}

export function defaultChampionships(): Championship[] {
  return CHAMPIONSHIP_TEMPLATES.map((t, i) => ({
    id: `chp_base_${i}`,
    name: t.name,
    logo: ["🏆", "🏁", "🎖", "⏱"][i] ?? "🏆",
    kind: t.kind,
    teamCount: 10,
    driversPerTeam: 2,
    raceCount: t.raceCount,
    calendar: TRACKS.slice(0, Math.min(TRACKS.length, t.raceCount)).map((x) => x.id),
    points: POINTS,
    budgetLimit: t.budgetLimit,
    carRules: t.carRules,
    rules: t.rules,
    custom: false,
  }));
}

export function createEvent(kind: SeasonEvent["kind"]): SeasonEvent {
  const tpl = EVENT_TEMPLATES.find((e) => e.kind === kind) ?? EVENT_TEMPLATES[0]!;
  const tier = rnd(0.8, 1.8);
  return {
    id: uid("evt"),
    name: tpl.name,
    kind,
    trackId: pick(TRACKS).id,
    entryFee: Math.round(200_000 * tier),
    reward: Math.round(1_400_000 * tier),
    reputation: rndInt(2, 6),
    done: false,
    description: tpl.desc,
  };
}

export function defaultEvents(): SeasonEvent[] {
  return EVENT_TEMPLATES.map((t) => createEvent(t.kind));
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
      development: rnd(0.6, 1.4),
    };
  });

  const rookies = all.slice(-40).sort(() => Math.random() - 0.5).slice(0, 2);
  rookies.forEach((d) => {
    d.teamId = "player";
    d.contractSeasons = 2;
  });

  // Personal-Markt & Startpersonal
  const staff: Record<string, Staff> = {};
  const staffMarket: string[] = [];
  for (let i = 0; i < 40; i++) {
    const s = createStaff(pick(STAFF_ROLES), rnd(35, 90));
    staff[s.id] = s;
    staffMarket.push(s.id);
  }
  const starters = STAFF_ROLES.map((role) => {
    const s = createStaff(role, rnd(38, 55));
    s.teamId = "player";
    staff[s.id] = s;
    return s.id;
  });

  // Nachwuchs-Talente
  const youthProspects: string[] = [];
  for (let i = 0; i < 8; i++) {
    const d = createDriver(rnd(28, 58), { age: rndInt(15, 19), academy: true });
    drivers[d.id] = d;
    youthProspects.push(d.id);
  }

  const budget = DIFFICULTY[opts.difficulty].budget * (opts.style === "engineering" ? 0.85 : 1);

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
    staffIds: starters,
    academyIds: [],
    development: defaultDevelopment(),
    design: defaultDesign(opts.color, opts.logo),
    finance: defaultFinance(),
    legacyPoints: 0,
  };

  const championships = defaultChampionships();
  const calendar = TRACKS.map((t) => t.id);

  return {
    version: SAVE_VERSION,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    difficulty: opts.difficulty,
    team,
    aiTeams,
    drivers,
    staff,
    freeAgents: all.filter((d) => !d.teamId && !d.academy).map((d) => d.id),
    staffMarket,
    youthProspects,
    season: {
      year: 2026,
      round: 0,
      calendar,
      standings: {},
      teamStandings: {},
      races: [],
      trainingDone: false,
      qualiDone: false,
      lastQualifying: null,
    },
    availableSponsors: Array.from({ length: 4 }, createSponsor),
    aiStrengthModifier: DIFFICULTY[opts.difficulty].aiStrength,
    weather: makeWeather(TRACKS[0]!),
    championships,
    activeChampionshipId: championships[0]?.id ?? null,
    events: defaultEvents(),
    media: defaultMedia(),
    world: defaultWorld(),
    profile: defaultProfile(opts.teamName),
    premium: defaultPremium(),
    customTracks: [],
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
  wet: number;
  consistency: number;
  aggression: number;
}

const STRATEGY_MOD: Record<Strategy, { pace: number; risk: number }> = {
  aggressive: { pace: 4, risk: 0.06 },
  normal: { pace: 0, risk: 0 },
  safe: { pace: -2.5, risk: -0.03 },
};

function weatherPace(kind: WeatherKind, wetSkill: number, consistency: number): number {
  const w = WEATHER_LABELS[kind];
  if (kind === "sun") return 0;
  const base = (1 - w.grip) * 40;
  const skill = kind === "rain" || kind === "storm" || kind === "fog" ? wetSkill : consistency;
  return -base + ((skill - 55) / 100) * base * 1.8;
}

function buildField(state: GameState, strategy: Strategy, trackId: string): Entrant[] {
  const track = getTrack(state, trackId);
  const field: Entrant[] = [];
  const carPerf = carPerformance(state);
  const carRel = carReliability(state);
  const weather = state.weather.kind;
  const stratBonus = state.team.research.strategyDev.level * 1.2 + staffPower(state, "strategist") / 25;
  const aggro = state.team.style === "aggressive" ? 2 : 0;
  const setupBonus = (state.team.development.setup - 40) / 12;

  for (const id of state.team.lineup) {
    if (!id) continue;
    const d = state.drivers[id];
    if (!d) continue;
    const s = d.skills;
    const t = d.traits;
    const driverPace = s.speed * track.power + s.cornering * track.corners + s.braking * track.brakes;
    const mental = (t.motivation + t.confidence + t.pressure) / 3;
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
        (d.form - 55) / 10 +
        (mental - 55) / 14 +
        setupBonus +
        STRATEGY_MOD[strategy].pace +
        stratBonus +
        aggro +
        weatherPace(weather, s.wet, s.consistency),
      reliability: carRel - STRATEGY_MOD[strategy].risk * 100 - (aggro ? 3 : 0) - (weather === "storm" ? 4 : 0),
      wet: s.wet,
      consistency: s.consistency,
      aggression: t.aggression,
    });
  }

  for (const ai of state.aiTeams) {
    for (const id of ai.driverIds) {
      const d = state.drivers[id];
      if (!d || d.retired) continue;
      const s = d.skills;
      const driverPace = s.speed * track.power + s.cornering * track.corners + s.braking * track.brakes;
      field.push({
        driverId: d.id,
        driverName: d.name,
        teamId: ai.id,
        teamName: ai.name,
        teamColor: ai.color,
        pace:
          (driverPace * 0.5 + ai.strength * 0.5) * state.aiStrengthModifier +
          (d.form - 55) / 12 +
          weatherPace(weather, s.wet, s.consistency),
        reliability: clamp(ai.strength * 0.85 + 12 - (weather === "storm" ? 4 : 0), 40, 96),
        wet: s.wet,
        consistency: s.consistency,
        aggression: d.traits?.aggression ?? 50,
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
  const spread = state.weather.kind === "sun" ? 6 : 9;
  return field
    .map((e) => ({ ...e, q: e.pace + rnd(-spread, spread) }))
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

export function simulateRace(state: GameState, strategy: Strategy, overrideTrackId?: string): RaceOutcome {
  const trackId = overrideTrackId ?? state.season.calendar[state.season.round]!;
  const track = getTrack(state, trackId);
  const field = buildField(state, strategy, trackId);
  const weather = state.weather.kind;
  const w = WEATHER_LABELS[weather];
  const grid = new Map<string, number>();
  const quali = state.season.lastQualifying ?? simulateQualifying(state, strategy);
  quali.forEach((q) => grid.set(q.driverId, q.position));
  field.forEach((e, i) => {
    if (!grid.has(e.driverId)) grid.set(e.driverId, i + 1);
  });

  const log: string[] = [
    `Start in ${track.name} · ${track.laps} Runden · ${w.icon} ${w.label} (${state.weather.temperature}°C)`,
  ];

  const mechanic = staffPower(state, "mechanic");
  const strategist = staffPower(state, "strategist");
  const points = state.championships.find((c) => c.id === state.activeChampionshipId)?.points ?? POINTS;

  const safetyCar = Math.random() < 0.18 + (weather === "rain" ? 0.12 : 0) + (weather === "storm" ? 0.2 : 0) + (track.kind === "street" ? 0.12 : 0);
  if (safetyCar) log.push("Safety Car auf der Strecke – das Feld rückt zusammen.");

  const rows = field.map((e) => {
    const startPos = grid.get(e.driverId) ?? 20;
    const gridBonus = (20 - startPos) * (0.35 + (10 - track.overtaking) * 0.02);
    const incidents: string[] = [];
    let score = e.pace + gridBonus + rnd(-7, 7) + (safetyCar ? rnd(-3, 3) : 0);
    let dnf = rnd(0, 100) > e.reliability + 12;
    let penalty = 0;

    // Reifenverschleiß
    const wearRisk = (track.tyreWear / 10) * w.wear;
    if (Math.random() < wearRisk * 0.22) {
      score -= rnd(3, 9);
      incidents.push("Reifenprobleme");
    }
    // Unfälle
    const crashRisk = 0.03 + (e.aggression / 100) * 0.05 + (1 - w.grip) * 0.35 + (track.kind === "street" ? 0.03 : 0);
    if (!dnf && Math.random() < crashRisk * 0.35) {
      dnf = true;
      incidents.push("Unfall");
    }
    // Strafen
    if (Math.random() < 0.05 + (e.aggression / 100) * 0.05) {
      penalty = pick([5, 5, 10]);
      score -= penalty * 0.8;
      incidents.push(`${penalty}s Zeitstrafe`);
    }
    // Boxenfehler (Mechaniker mildern das für den Spieler)
    const pitRisk = e.teamId === "player" ? 0.12 - mechanic / 900 : 0.1;
    if (Math.random() < pitRisk) {
      score -= rnd(2, 7);
      incidents.push("Boxenfehler");
    }
    // Strategieänderung
    if (e.teamId === "player" && Math.random() < 0.3 + strategist / 400) {
      score += rnd(0.5, 4);
      incidents.push("Strategieänderung greift");
    }
    if (dnf) incidents.push("Ausfall");
    return { e, startPos, dnf, score, incidents, penalty };
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
      points: points[i] ?? 0,
      dnf: false,
      fastestLap: r === fastest,
      incidents: r.incidents,
      penaltySeconds: r.penalty,
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
      incidents: r.incidents,
      penaltySeconds: r.penalty,
    })),
  ];

  const winner = results[0];
  if (winner) log.push(`Runde 1: ${winner.driverName} übernimmt die Führung.`);
  if (weather === "rain" || weather === "storm") log.push("Regen wird stärker – die Teams wechseln auf Regenreifen.");
  if (weather === "heat") log.push("Extreme Hitze: Reifen bauen früh ab.");
  if (weather === "fog") log.push("Nebel behindert die Sicht – Überholmanöver werden selten.");
  dnfs.slice(0, 3).forEach((r) =>
    log.push(`Ausfall: ${r.e.driverName} (${r.e.teamName}) – ${r.incidents.includes("Unfall") ? "Unfall" : "technischer Defekt"}.`),
  );
  const player = results.filter((r) => r.teamId === "player");
  player.forEach((p) => {
    const extra = (p.incidents ?? []).filter((x) => x !== "Ausfall");
    log.push(
      p.dnf
        ? `${p.driverName} scheidet aus (Start P${p.grid})${extra.length ? ` – ${extra.join(", ")}` : ""}.`
        : `${p.driverName}: P${p.grid} → P${p.position} (${p.points} Punkte)${extra.length ? ` – ${extra.join(", ")}` : ""}.`,
    );
  });
  if (winner) log.push(`Zielflagge: Sieg für ${winner.driverName} (${winner.teamName}).`);

  return {
    record: {
      round: state.season.round + 1,
      trackId,
      trackName: track.name,
      results,
      weather,
      championshipId: state.activeChampionshipId,
    },
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

export function commercialIncome(state: GameState): { tv: number; merch: number; tickets: number; investors: number } {
  const f = state.team.finance;
  const fans = state.media.fanbase;
  const rep = state.team.reputation;
  return {
    tv: Math.round(f.tvDeal * (1 + rep / 120)),
    merch: Math.round(f.merchLevel * 90_000 + fans * 1.4 * (1 + f.marketing * 0.08)),
    tickets: Math.round(f.ticketLevel * 120_000 + fans * 0.9),
    investors: Math.round(f.investors * 60_000),
  };
}

export function staffCosts(state: GameState): number {
  return Math.round(state.team.staffIds.reduce((s, id) => s + (state.staff[id]?.salary ?? 0) / 12, 0));
}

export function weeklyCosts(state: GameState): number {
  const salaries = state.team.driverIds.reduce((s, id) => s + (state.drivers[id]?.salary ?? 0) / 12, 0);
  const facilities = Object.values(state.team.buildings).reduce((s, b) => s + b.level * 40_000, 0);
  const f = state.team.finance;
  const marketing = f.marketing * 70_000;
  const factory = f.factory * 90_000;
  return Math.round(salaries + facilities + staffCosts(state) + marketing + factory + f.travelCost);
}

export { PARTS, RESEARCH, BUILDINGS, STAFF_ROLES };
