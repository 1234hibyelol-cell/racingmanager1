// Motorsport-Welt: Fahrer-Lebenszyklus, Welt-Simulation, Medien, Nachwuchs, Historie.
import { AI_TEAM_DEFS, PERSONALITIES, SPONSOR_NAMES } from "./data";
import {
  clamp,
  createDriver,
  createSponsor,
  createStaff,
  driverRating,
  pick,
  rnd,
  rndInt,
  STAFF_ROLES,
  driverStage,
  uid,
} from "./engine";
import type { Driver, GameState, MediaEvent, NewsItem, Staff } from "./types";

export function pushNews(s: GameState, text: string, tag: NewsItem["tag"]) {
  s.world.news.unshift({ id: uid("news"), year: s.season.year, round: s.season.round, text, tag });
  s.world.news = s.world.news.slice(0, 120);
}

/* ---------- Fahrer-Entwicklung ---------- */
const SKILL_KEYS = [
  "speed", "cornering", "braking", "overtaking", "defending", "wet", "consistency", "raceIQ",
] as const;

/** Entwicklung eines Fahrers über eine Saison (Talent, Alter, Höhepunkt, Verfall). */
export function developDriver(s: GameState, d: Driver) {
  d.age += 1;
  d.stage = driverStage(d);
  const talentFactor = d.skills.talent / 100;
  let delta = 0;
  switch (d.stage) {
    case "prospect": delta = 2.5 + talentFactor * 4; break;
    case "rising": delta = 1.5 + talentFactor * 3; break;
    case "prime": delta = 0.3 + talentFactor * 0.8; break;
    case "veteran": delta = -0.6; break;
    case "declining": delta = -2.2 - (d.age - d.peakAge) * 0.15; break;
    default: delta = 0;
  }
  const motivation = (d.traits.motivation - 55) / 90;
  for (const k of SKILL_KEYS) {
    d.skills[k] = clamp(Math.round(d.skills[k] + delta * (1 + motivation) + rnd(-1, 1)));
  }
  d.skills.experience = clamp(d.skills.experience + (d.stage === "prospect" ? 4 : 2));
  d.form = clamp(rndInt(45, 90));
  const r = driverRating(d);
  d.marketValue = Math.round((r ** 2.6) / 90) * 1000;
  d.salary = Math.round(d.marketValue / 12 / 1000) * 1000 + 60_000;

  // Rücktritt
  const retireChance = d.age >= 40 ? 1 : d.age >= 36 ? 0.35 + (d.age - 36) * 0.15 : d.age >= 33 ? 0.08 : 0;
  if (!d.retired && Math.random() < retireChance) retireDriver(s, d);
}

export function retireDriver(s: GameState, d: Driver) {
  d.retired = true;
  d.stage = "retired";
  const legend = d.stats.championships >= 2 || d.stats.wins >= 15;
  if (legend) {
    d.legend = true;
    s.world.legends.unshift(`${d.name} · ${d.stats.championships} Titel, ${d.stats.wins} Siege`);
    s.world.legends = s.world.legends.slice(0, 40);
    pushNews(s, `${d.name} beendet die Karriere als Legende (${d.stats.wins} Siege).`, "legend");
  } else {
    pushNews(s, `${d.name} geht in den Ruhestand.`, "transfer");
  }
  const wasTeam = d.teamId;
  d.teamId = null;
  d.contractSeasons = 0;
  s.freeAgents = s.freeAgents.filter((id) => id !== d.id);
  s.team.driverIds = s.team.driverIds.filter((id) => id !== d.id);
  s.team.lineup = s.team.lineup.map((id) => (id === d.id ? null : id)) as GameState["team"]["lineup"];
  s.aiTeams.forEach((t) => {
    if (t.id === wasTeam) t.driverIds = t.driverIds.filter((id) => id !== d.id);
  });
}

/** Rivalitäten & Freundschaften aus Rennergebnissen ableiten. */
export function updateRelations(s: GameState, order: { driverId: string; position: number | null }[]) {
  const top = order.filter((r) => r.position && r.position <= 6).slice(0, 6);
  for (const a of top) {
    for (const b of top) {
      if (a.driverId === b.driverId) continue;
      const da = s.drivers[a.driverId];
      const db = s.drivers[b.driverId];
      if (!da || !db) continue;
      const closeFight = Math.abs((a.position ?? 0) - (b.position ?? 0)) === 1;
      if (!closeFight) continue;
      if ((da.traits.aggression + db.traits.aggression) / 2 > 62) {
        if (!da.rivalIds.includes(db.id) && Math.random() < 0.25) {
          da.rivalIds.push(db.id);
          db.rivalIds.push(da.id);
          pushNews(s, `Neue Rivalität: ${da.name} gegen ${db.name}.`, "record");
        }
      } else if (!da.friendIds.includes(db.id) && Math.random() < 0.15) {
        da.friendIds.push(db.id);
        db.friendIds.push(da.id);
      }
    }
  }
}

/* ---------- Welt-Simulation ---------- */
/** Läuft nach jedem Rennen: KI-Entwicklung, Transfers, Sponsoren, Talente, Rekorde. */
export function simulateWorldTick(s: GameState) {
  // KI-Teams entwickeln ihre Fahrzeuge
  for (const ai of s.aiTeams) {
    const drift = rnd(-0.4, 0.9) * (ai.development ?? 1);
    ai.strength = clamp(ai.strength + drift, 45, 99);
    if (drift > 0.7 && Math.random() < 0.2) {
      pushNews(s, `${ai.name} bringt ein Entwicklungspaket – deutlich mehr Pace.`, "development");
    }
  }

  // Form aller Fahrer schwankt
  for (const d of Object.values(s.drivers)) {
    if (d.retired) continue;
    d.form = clamp(d.form + rnd(-8, 8), 25, 99);
    d.traits.motivation = clamp(d.traits.motivation + rnd(-3, 3));
  }

  // Zwischensaison-Transfers zwischen KI-Teams
  if (Math.random() < 0.25) {
    const from = pick(s.aiTeams);
    const to = pick(s.aiTeams.filter((t) => t.id !== from.id));
    const id = from.driverIds[rndInt(0, Math.max(0, from.driverIds.length - 1))];
    const d = id ? s.drivers[id] : null;
    if (d && to && d.traits.loyalty < 70) {
      from.driverIds = from.driverIds.filter((x) => x !== d.id);
      to.driverIds.push(d.id);
      d.teamId = to.id;
      pushNews(s, `Transfer: ${d.name} wechselt von ${from.name} zu ${to.name}.`, "transfer");
    }
  }

  // Sponsorenmarkt rotiert
  if (Math.random() < 0.2) {
    const idx = rndInt(0, s.availableSponsors.length - 1);
    const old = s.availableSponsors[idx];
    if (old && !s.team.sponsorIds.includes(old.id)) {
      const next = createSponsor();
      s.availableSponsors[idx] = next;
      pushNews(s, `${old.name} zieht sich zurück, ${next.name} tritt in den Motorsport ein.`, "sponsor");
    }
  }

  // Neue Talente
  if (Math.random() < 0.3) {
    const d = createDriver(rnd(30, 62), { age: rndInt(15, 19), academy: true });
    s.drivers[d.id] = d;
    s.youthProspects.push(d.id);
    if (s.youthProspects.length > 14) s.youthProspects.shift();
    pushNews(s, `Neues Talent entdeckt: ${d.name} (${d.age}) aus ${d.nationality}.`, "talent");
  }

  // Personalmarkt
  if (Math.random() < 0.2) {
    const st = createStaff(pick(STAFF_ROLES));
    s.staff[st.id] = st;
    s.staffMarket.push(st.id);
    if (s.staffMarket.length > 60) s.staffMarket.shift();
  }

  updateRecords(s);
}

export function updateRecords(s: GameState) {
  let wins = { name: "–", value: 0 };
  let titles = { name: "–", value: 0 };
  let points = { name: "–", value: 0 };
  for (const d of Object.values(s.drivers)) {
    if (d.stats.wins > wins.value) wins = { name: d.name, value: d.stats.wins };
    if (d.stats.championships > titles.value) titles = { name: d.name, value: d.stats.championships };
    if (d.stats.points > points.value) points = { name: d.name, value: Math.round(d.stats.points) };
  }
  const best = [...s.aiTeams.map((t) => ({ name: t.name, value: Math.round(t.strength) })),
    { name: s.team.name, value: s.team.stats.points }]
    .sort((a, b) => b.value - a.value)[0]!;
  const prev = s.world.records;
  if (wins.value > prev.mostWins.value && wins.value > 0) {
    pushNews(s, `Rekord: ${wins.name} hält nun ${wins.value} Siege.`, "record");
  }
  s.world.records = { mostWins: wins, mostTitles: titles, mostPoints: points, bestTeam: best };
}

/* ---------- Nachwuchsakademie ---------- */
export function academyScoutQuality(s: GameState): number {
  const b = s.team.buildings;
  return b.kartSchool.level * 6 + b.talentCenter.level * 8 + b.juniorTeam.level * 4;
}

export function scoutYouth(s: GameState): Driver {
  const q = academyScoutQuality(s);
  const d = createDriver(rnd(28, 45) + q * 0.6, { age: rndInt(15, 19), academy: true });
  s.drivers[d.id] = d;
  s.youthProspects.unshift(d.id);
  pushNews(s, `Scouting: ${d.name} (${d.age}) wurde entdeckt.`, "talent");
  return d;
}

export function trainYouth(s: GameState, id: string): number {
  const d = s.drivers[id];
  if (!d) return 0;
  const gain = 1.5 + s.team.buildings.youthSimulator.level * 0.8 + s.team.buildings.juniorTeam.level * 0.4 + d.skills.talent / 60;
  for (const k of SKILL_KEYS) d.skills[k] = clamp(Math.round(d.skills[k] + gain * rnd(0.5, 1.2)));
  d.skills.experience = clamp(d.skills.experience + 1.5);
  d.marketValue = Math.round(((driverRating(d)) ** 2.6) / 90) * 1000;
  return gain;
}

/** Nachwuchsrennen: Akademiefahrer messen sich, Sieger gewinnt Erfahrung & Beliebtheit. */
export function runYouthRace(s: GameState): { name: string; rating: number }[] {
  const field = [...s.team.academyIds, ...s.youthProspects.slice(0, 10)]
    .map((id) => s.drivers[id])
    .filter((d): d is Driver => !!d)
    .map((d) => ({ d, score: driverRating(d) + rnd(-8, 8) + (d.form - 55) / 8 }))
    .sort((a, b) => b.score - a.score);
  field.forEach(({ d }, i) => {
    d.skills.experience = clamp(d.skills.experience + (i === 0 ? 3 : 1.5));
    d.traits.confidence = clamp(d.traits.confidence + (i === 0 ? 4 : i < 3 ? 1 : -1));
    d.traits.popularity = clamp(d.traits.popularity + (i === 0 ? 3 : 0));
  });
  const winner = field[0];
  if (winner) pushNews(s, `Nachwuchsrennen gewonnen von ${winner.d.name}.`, "talent");
  return field.map(({ d }) => ({ name: d.name, rating: driverRating(d) }));
}

/* ---------- Medien ---------- */
const PRESS_TOPICS: { kind: MediaEvent["kind"]; headline: string; question: string }[] = [
  { kind: "press", headline: "Pressekonferenz vor dem Rennen", question: "Wie bewertest du die Chancen deines Teams?" },
  { kind: "press", headline: "Kritik an der Fahrzeugentwicklung", question: "Die Presse fragt nach dem Entwicklungsrückstand." },
  { kind: "interview", headline: "Fahrer-Interview", question: "Journalisten fragen nach der Fahrerhierarchie im Team." },
  { kind: "interview", headline: "Vertragsgerüchte", question: "Ein Fahrer wird mit einem Konkurrenten in Verbindung gebracht." },
  { kind: "social", headline: "Fan-Diskussion in den sozialen Medien", question: "Die Fangemeinde diskutiert deine Rennstrategie." },
];

export function createMediaEvent(s: GameState): MediaEvent {
  const topic = pick(PRESS_TOPICS);
  const driverId = s.team.lineup.find(Boolean) ?? null;
  return {
    id: uid("med"),
    kind: topic.kind,
    headline: topic.headline,
    question: topic.question,
    driverId,
    options: [
      { id: "bold", label: "Selbstbewusst antworten", reputation: 3, morale: 4, sponsorBonus: 120_000, fan: 900 },
      { id: "humble", label: "Bescheiden bleiben", reputation: 1, morale: 2, sponsorBonus: 40_000, fan: 350 },
      { id: "attack", label: "Konkurrenz angreifen", reputation: -2, morale: 6, sponsorBonus: -80_000, fan: 1600 },
      { id: "duck", label: "Keine Aussage", reputation: -1, morale: -2, sponsorBonus: 0, fan: -200 },
    ],
  };
}

export function applyMediaOption(s: GameState, eventId: string, optionId: string): string {
  const ev = s.media.pending.find((e) => e.id === eventId);
  if (!ev) return "Kein Medientermin offen.";
  const opt = ev.options.find((o) => o.id === optionId);
  if (!opt) return "Unbekannte Antwort.";
  s.team.reputation = clamp(s.team.reputation + opt.reputation, 0, 100);
  s.team.money += opt.sponsorBonus;
  s.media.fanbase = Math.max(0, s.media.fanbase + opt.fan);
  for (const id of s.team.driverIds) {
    const d = s.drivers[id];
    if (d) d.traits.motivation = clamp(d.traits.motivation + opt.morale);
  }
  s.media.pending = s.media.pending.filter((e) => e.id !== eventId);
  const tone: "positive" | "neutral" | "negative" = opt.reputation > 0 ? "positive" : opt.reputation < 0 ? "negative" : "neutral";
  s.media.feed.unshift({
    id: uid("post"),
    author: `@${pick(SPONSOR_NAMES).split(" ")[0]!.toLowerCase()}fan`,
    text:
      tone === "positive"
        ? `Starke Worte von ${s.team.name} – so kennt man ein Topteam!`
        : tone === "negative"
          ? `${s.team.name} sorgt für Zoff im Fahrerlager.`
          : `${s.team.name} bleibt zurückhaltend vor dem Rennen.`,
    tone,
    createdRound: s.season.round,
  });
  s.media.feed = s.media.feed.slice(0, 40);
  return `${opt.label}: Ruf ${opt.reputation >= 0 ? "+" : ""}${opt.reputation}, Fans ${opt.fan >= 0 ? "+" : ""}${opt.fan}`;
}

export function addRaceReactions(s: GameState, bestPosition: number | null) {
  const tone: "positive" | "neutral" | "negative" = bestPosition && bestPosition <= 3 ? "positive" : bestPosition && bestPosition <= 10 ? "neutral" : "negative";
  const texts = {
    positive: [`Podium für ${s.team.name}! Die Fans feiern.`, `${s.team.name} ist wieder ein Titelkandidat.`],
    neutral: [`Solides Ergebnis für ${s.team.name}.`, `${s.team.name} sammelt wichtige Punkte.`],
    negative: [`Enttäuschung bei ${s.team.name}.`, `Die Fans fordern Antworten von ${s.team.name}.`],
  } as const;
  s.media.feed.unshift({
    id: uid("post"),
    author: `@${pick(PERSONALITIES).toLowerCase()}_racer`,
    text: pick(texts[tone]),
    tone,
    createdRound: s.season.round,
  });
  s.media.fanbase = Math.max(0, Math.round(s.media.fanbase * (tone === "positive" ? 1.06 : tone === "neutral" ? 1.01 : 0.98)));
  if (Math.random() < 0.55) s.media.pending.push(createMediaEvent(s));
}

/* ---------- Generationswechsel ---------- */
/** Nach Saisonende: Nachwuchs auffüllen, Legenden aufnehmen, neue Generation zählen. */
export function refreshGeneration(s: GameState) {
  const activeDrivers = Object.values(s.drivers).filter((d) => !d.retired && !d.academy);
  const missing = 120 - activeDrivers.length;
  for (let i = 0; i < Math.max(0, missing); i++) {
    const d = createDriver(rnd(32, 80), { age: rndInt(18, 24) });
    s.drivers[d.id] = d;
    s.freeAgents.push(d.id);
  }
  if (missing > 20) {
    s.world.generation += 1;
    pushNews(s, `Eine neue Fahrergeneration übernimmt das Fahrerlager (Generation ${s.world.generation}).`, "talent");
  }
  // KI-Teams füllen leere Cockpits
  for (const ai of s.aiTeams) {
    while (ai.driverIds.length < 2) {
      const best = s.freeAgents
        .map((id) => s.drivers[id])
        .filter((d): d is Driver => !!d && !d.retired)
        .sort((a, b) => driverRating(b) - driverRating(a))[0];
      if (!best) break;
      best.teamId = ai.id;
      best.contractSeasons = rndInt(1, 3);
      ai.driverIds.push(best.id);
      s.freeAgents = s.freeAgents.filter((id) => id !== best.id);
      pushNews(s, `${ai.name} verpflichtet ${best.name}.`, "transfer");
    }
  }
  // Personal altert
  for (const st of Object.values(s.staff) as Staff[]) {
    st.age += 1;
    st.experience = clamp(st.experience + 1);
    if (st.age > 66) {
      s.staffMarket = s.staffMarket.filter((id) => id !== st.id);
      s.team.staffIds = s.team.staffIds.filter((id) => id !== st.id);
      delete s.staff[st.id];
    }
  }
  while (s.staffMarket.length < 25) {
    const st = createStaff(pick(STAFF_ROLES));
    s.staff[st.id] = st;
    s.staffMarket.push(st.id);
  }
  // Legacy: Punkte für Motorsport-Erbe
  s.team.legacyPoints += s.team.stats.championships * 50 + s.team.stats.wins * 5 + s.team.stats.seasonsPlayed * 3;
  if (AI_TEAM_DEFS.length && s.team.stats.championships >= 3 && !s.world.legends.some((l) => l.startsWith(s.team.name))) {
    s.world.legends.unshift(`${s.team.name} · Dynastie mit ${s.team.stats.championships} Titeln`);
  }
}
