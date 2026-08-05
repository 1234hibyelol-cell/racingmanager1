// Auffüllen fehlender Bauphase-2-Felder in alten Spielständen (nicht-destruktiv).
import { PARTS, BUILDINGS, STAFF_ROLES } from "./engine";
import {
  createStaff,
  defaultChampionships,
  defaultDesign,
  defaultDevelopment,
  defaultEvents,
  defaultFinance,
  defaultMedia,
  defaultPremium,
  defaultProfile,
  defaultWorld,
  driverStage,
  makeGear,
  makeTraits,
  makeWeather,
  rndInt,
  createDriver,
} from "./engine";
import { TRACKS } from "./data";
import type { GameState, Staff } from "./types";

export function ensureExpansion(state: GameState): GameState {
  const s = state;

  /* Fahrer */
  for (const d of Object.values(s.drivers)) {
    if (!d.traits) d.traits = makeTraits();
    if (typeof d.peakAge !== "number") d.peakAge = rndInt(26, 32);
    if (typeof d.form !== "number") d.form = rndInt(45, 85);
    if (!d.rivalIds) d.rivalIds = [];
    if (!d.friendIds) d.friendIds = [];
    if (typeof d.retired !== "boolean") d.retired = false;
    if (typeof d.legend !== "boolean") d.legend = false;
    if (typeof d.academy !== "boolean") d.academy = false;
    if (!d.gear) d.gear = makeGear();
    if (!d.stage) d.stage = driverStage(d);
  }

  /* Fahrzeugteile */
  for (const p of PARTS) {
    if (!s.team.car.parts[p]) {
      s.team.car.parts[p] = { level: 1, performance: rndInt(28, 38), reliability: rndInt(55, 70) };
    }
  }

  /* Gebäude */
  for (const b of BUILDINGS) {
    if (!s.team.buildings[b]) s.team.buildings[b] = { level: 1 };
  }

  /* Team-Erweiterungen */
  if (!s.team.staffIds) s.team.staffIds = [];
  if (!s.team.academyIds) s.team.academyIds = [];
  if (!s.team.development) s.team.development = defaultDevelopment();
  if (!s.team.design) s.team.design = defaultDesign(s.team.color, s.team.logo);
  if (!s.team.finance) s.team.finance = defaultFinance();
  if (typeof s.team.legacyPoints !== "number") s.team.legacyPoints = 0;

  /* Personal */
  if (!s.staff) s.staff = {};
  if (!s.staffMarket) s.staffMarket = [];
  if (s.staffMarket.length === 0) {
    for (let i = 0; i < 40; i++) {
      const st = createStaff(STAFF_ROLES[i % STAFF_ROLES.length]!);
      s.staff[st.id] = st;
      s.staffMarket.push(st.id);
    }
  }
  if (s.team.staffIds.length === 0) {
    for (const role of STAFF_ROLES) {
      const st: Staff = createStaff(role, 45);
      st.teamId = "player";
      s.staff[st.id] = st;
      s.team.staffIds.push(st.id);
    }
  }

  /* Nachwuchs */
  if (!s.youthProspects) s.youthProspects = [];
  if (s.youthProspects.length === 0) {
    for (let i = 0; i < 6; i++) {
      const d = createDriver(40, { age: rndInt(15, 19), academy: true });
      s.drivers[d.id] = d;
      s.youthProspects.push(d.id);
    }
  }

  /* Welt-Systeme */
  if (!s.weather) s.weather = makeWeather(TRACKS[0]!);
  if (!s.championships || s.championships.length === 0) s.championships = defaultChampionships();
  if (s.activeChampionshipId === undefined) s.activeChampionshipId = s.championships[0]?.id ?? null;
  if (!s.events) s.events = defaultEvents();
  if (!s.media) s.media = defaultMedia();
  if (!s.world) s.world = defaultWorld();
  if (!s.profile) s.profile = defaultProfile(s.team.name);
  if (!s.premium) s.premium = defaultPremium();
  if (!s.customTracks) s.customTracks = [];
  for (const ai of s.aiTeams) if (typeof ai.development !== "number") ai.development = 1;

  /* Sponsorenmarkt: Stufen & Bedingungen nachrüsten */
  for (const sp of s.availableSponsors ?? []) {
    if (!sp.tier) {
      const factor = sp.perRace / 120_000;
      sp.tier = factor >= 2.2 ? "global" : factor >= 1.4 ? "premium" : factor >= 0.8 ? "solide" : "regional";
    }
    if (typeof sp.minReputation !== "number") {
      sp.minReputation = sp.tier === "global" ? 70 : sp.tier === "premium" ? 50 : sp.tier === "solide" ? 25 : 0;
    }
    if (typeof sp.minWins !== "number") {
      sp.minWins = sp.tier === "global" ? 3 : sp.tier === "premium" ? 1 : 0;
    }
  }
  if (s.team.sponsorIds.length > 3) s.team.sponsorIds = s.team.sponsorIds.slice(0, 3);
  if (s.team.finance && s.team.finance.investors > 3) s.team.finance.investors = 3;

  return s;
}
