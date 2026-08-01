// Zentraler Spielzustand + Aktionen (React-Adapter über die reine Engine).
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  BUILDINGS,
  buildingCost,
  carPerformance,
  createDriver,
  createNewGame,
  createSponsor,
  clamp,
  driverRating,
  raceIncome,
  researchCost,
  simulateQualifying,
  simulateRace,
  trainingCost,
  upgradeCost,
  weeklyCosts,
  type NewGameOptions,
  type RaceOutcome,
} from "./engine";
import { AUTO_SLOT, deleteSave, listSaves, loadGame, saveGame, type SaveMeta } from "./save";
import type {
  BuildingKey,
  GameState,
  PartKey,
  RaceRecord,
  ResearchKey,
  Strategy,
} from "./types";

export type Screen =
  | "menu"
  | "newgame"
  | "load"
  | "settings"
  | "dashboard"
  | "drivers"
  | "market"
  | "car"
  | "research"
  | "buildings"
  | "season"
  | "race"
  | "sponsors"
  | "stats"
  | "admin";

export interface Settings {
  skipAnimations: boolean;
  autoSave: boolean;
}

export function useGameEngine() {
  const [state, setState] = useState<GameState | null>(null);
  const [screen, setScreen] = useState<Screen>("menu");
  const [settings, setSettings] = useState<Settings>({ skipAnimations: false, autoSave: true });
  const [saves, setSaves] = useState<SaveMeta[]>([]);
  const [toast, setToast] = useState<string | null>(null);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const refreshSaves = useCallback(() => setSaves(listSaves()), []);
  useEffect(() => refreshSaves(), [refreshSaves]);

  const notify = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }, []);

  const patch = useCallback((fn: (s: GameState) => GameState | void) => {
    setState((prev) => {
      if (!prev) return prev;
      const draft = structuredClone(prev) as GameState;
      const next = fn(draft) ?? draft;
      next.updatedAt = Date.now();
      return next;
    });
  }, []);

  /* --- Spiel-Lifecycle --- */
  const newGame = useCallback(
    (opts: NewGameOptions) => {
      const s = createNewGame(opts);
      setState(s);
      saveGame(s, AUTO_SLOT);
      refreshSaves();
      setScreen("dashboard");
      notify("Karriere gestartet. Willkommen im Fahrerlager!");
    },
    [notify, refreshSaves],
  );

  const load = useCallback(
    (slot: number) => {
      const s = loadGame(slot);
      if (!s) return notify("Speicherplatz ist leer.");
      setState(s);
      setScreen("dashboard");
      notify(`Spielstand ${slot === AUTO_SLOT ? "Auto" : slot} geladen.`);
    },
    [notify],
  );

  const save = useCallback(
    (slot: number) => {
      if (!state) return;
      saveGame(state, slot);
      refreshSaves();
      notify(`Gespeichert in Slot ${slot === AUTO_SLOT ? "Auto" : slot}.`);
    },
    [notify, refreshSaves, state],
  );

  const removeSave = useCallback(
    (slot: number) => {
      deleteSave(slot);
      refreshSaves();
      notify("Spielstand gelöscht.");
    },
    [notify, refreshSaves],
  );

  // Automatisches Speichern
  useEffect(() => {
    if (!state || !settings.autoSave) return;
    saveGame(state, AUTO_SLOT);
    setSaves(listSaves());
  }, [state?.updatedAt, settings.autoSave]); // eslint-disable-line react-hooks/exhaustive-deps

  /* --- Aktionen --- */
  const spend = (s: GameState, amount: number) => {
    if (s.team.money < amount) return false;
    s.team.money -= amount;
    return true;
  };

  const actions = useMemo(
    () => ({
      upgradePart(part: PartKey) {
        if (!state) return;
        const cost = upgradeCost(state, part);
        patch((s) => {
          if (!spend(s, cost)) return notify("Nicht genug Budget.") as undefined;
          const p = s.team.car.parts[part];
          p.level += 1;
          p.performance = clamp(p.performance + 5 + s.team.buildings.garage.level, 1, 100);
          p.reliability = clamp(p.reliability + 2, 1, 99);
          notify(`${part} auf Level ${p.level} verbessert.`);
        });
      },
      reliabilityPass(part: PartKey) {
        if (!state) return;
        const cost = Math.round(upgradeCost(state, part) * 0.6);
        patch((s) => {
          if (!spend(s, cost)) return notify("Nicht genug Budget.") as undefined;
          const p = s.team.car.parts[part];
          p.reliability = clamp(p.reliability + 6 + s.team.buildings.workshop.level, 1, 99);
          notify("Zuverlässigkeit verbessert.");
        });
      },
      startResearch(key: ResearchKey) {
        if (!state) return;
        const cost = researchCost(state, key);
        patch((s) => {
          if (s.team.research[key].active) return notify("Projekt läuft bereits.") as undefined;
          if (!spend(s, cost)) return notify("Nicht genug Budget.") as undefined;
          s.team.research[key].active = true;
          notify("Forschungsprojekt gestartet.");
        });
      },
      upgradeBuilding(key: BuildingKey) {
        if (!state) return;
        const cost = buildingCost(state, key);
        patch((s) => {
          if (!spend(s, cost)) return notify("Nicht genug Budget.") as undefined;
          s.team.buildings[key].level += 1;
          notify(`Gebäude ausgebaut: Level ${s.team.buildings[key].level}.`);
        });
      },
      signDriver(id: string, seasons: number) {
        if (!state) return;
        patch((s) => {
          const d = s.drivers[id];
          if (!d) return;
          if (s.team.driverIds.length >= 4) return notify("Kader ist voll (max. 4).") as undefined;
          const fee = Math.round(d.marketValue * 0.15);
          if (!spend(s, fee)) return notify("Transferbudget reicht nicht.") as undefined;
          d.teamId = "player";
          d.contractSeasons = seasons;
          s.team.driverIds.push(id);
          s.freeAgents = s.freeAgents.filter((f) => f !== id);
          if (!s.team.lineup[0]) s.team.lineup[0] = id;
          else if (!s.team.lineup[1]) s.team.lineup[1] = id;
          notify(`${d.name} verpflichtet.`);
        });
      },
      releaseDriver(id: string) {
        patch((s) => {
          const d = s.drivers[id];
          if (!d) return;
          const fee = Math.round(d.salary * 0.5);
          s.team.money -= fee;
          d.teamId = null;
          d.contractSeasons = 0;
          s.team.driverIds = s.team.driverIds.filter((x) => x !== id);
          s.team.lineup = s.team.lineup.map((x) => (x === id ? null : x)) as GameState["team"]["lineup"];
          s.freeAgents.push(id);
          notify(`${d.name} entlassen (Abfindung fällig).`);
        });
      },
      setLineup(slot: 0 | 1, id: string | null) {
        patch((s) => {
          if (id && s.team.lineup[slot === 0 ? 1 : 0] === id) s.team.lineup[slot === 0 ? 1 : 0] = null;
          s.team.lineup[slot] = id;
        });
      },
      trainDriver(id: string, skill: keyof GameState["drivers"][string]["skills"]) {
        if (!state) return;
        const cost = trainingCost(state);
        patch((s) => {
          if (!spend(s, cost)) return notify("Nicht genug Budget.") as undefined;
          const d = s.drivers[id];
          if (!d) return;
          const gain = 1 + s.team.buildings.simulator.level * 0.6 + (s.team.style === "youth" ? 0.5 : 0);
          d.skills[skill] = clamp(Math.round(d.skills[skill] + gain));
          d.marketValue = Math.round(d.marketValue * 1.03);
          notify(`${d.name} trainiert: ${skill} +${gain.toFixed(1)}`);
        });
      },
      signSponsor(id: string) {
        patch((s) => {
          const sp = s.availableSponsors.find((x) => x.id === id);
          if (!sp) return;
          if (s.team.sponsorIds.length >= 3) return notify("Maximal 3 Sponsoren.") as undefined;
          s.team.sponsorIds.push(id);
          s.team.money += sp.signingBonus;
          notify(`${sp.name} unterschreibt (${sp.signingBonus.toLocaleString("de-DE")} € Bonus).`);
        });
      },
      runTraining(skip = false) {
        patch((s) => {
          if (s.season.trainingDone) return;
          s.season.trainingDone = true;
          if (!skip) {
            for (const id of s.team.lineup) {
              const d = id ? s.drivers[id] : null;
              if (d) d.skills.consistency = clamp(d.skills.consistency + 0.5);
            }
            s.team.money -= 60_000;
            notify("Training absolviert: Setup verbessert.");
          } else notify("Training übersprungen.");
        });
      },
      runQualifying(strategy: Strategy) {
        patch((s) => {
          const q = simulateQualifying(s, strategy);
          s.season.qualiDone = true;
          s.season.lastQualifying = q.map(({ driverId, position }) => ({ driverId, position }));
          const pole = q[0];
          if (pole && s.team.lineup.includes(pole.driverId)) {
            s.team.stats.poles += 1;
            const d = s.drivers[pole.driverId];
            if (d) d.stats.poles += 1;
          }
          notify(`Qualifying beendet – Pole: ${pole?.driverName ?? "-"}`);
        });
      },
      runRace(strategy: Strategy): RaceOutcome | null {
        if (!state) return null;
        const outcome = simulateRace(state, strategy);
        patch((s) => applyRaceResult(s, outcome.record, notify));
        return outcome;
      },
      /* Admin */
      admin: {
        addMoney: (amount: number) => patch((s) => void (s.team.money += amount)),
        setSkill: (id: string, skill: string, value: number) =>
          patch((s) => {
            const d = s.drivers[id];
            if (d) (d.skills as Record<string, number>)[skill] = clamp(value);
          }),
        createDriver: () =>
          patch((s) => {
            const d = createDriver(80);
            s.drivers[d.id] = d;
            s.freeAgents.unshift(d.id);
            notify(`Fahrer erstellt: ${d.name}`);
          }),
        deleteDriver: (id: string) =>
          patch((s) => {
            delete s.drivers[id];
            s.freeAgents = s.freeAgents.filter((x) => x !== id);
            s.team.driverIds = s.team.driverIds.filter((x) => x !== id);
            s.team.lineup = s.team.lineup.map((x) => (x === id ? null : x)) as GameState["team"]["lineup"];
            s.aiTeams.forEach((t) => (t.driverIds = t.driverIds.filter((x) => x !== id)));
          }),
        setPart: (part: PartKey, field: "performance" | "reliability" | "level", value: number) =>
          patch((s) => void (s.team.car.parts[part][field] = value)),
        completeResearch: (key: ResearchKey) =>
          patch((s) => {
            const r = s.team.research[key];
            r.level += 1;
            r.progress = 0;
            r.active = false;
          }),
        maxBuildings: () => patch((s) => BUILDINGS.forEach((b) => (s.team.buildings[b].level += 1))),
        setRound: (round: number) =>
          patch((s) => void (s.season.round = Math.max(0, Math.min(s.season.calendar.length - 1, round)))),
        setAiStrength: (v: number) => patch((s) => void (s.aiStrengthModifier = v)),
        setReputation: (v: number) => patch((s) => void (s.team.reputation = clamp(v, 0, 100))),
      },
    }),
    [notify, patch, state],
  );

  const derived = useMemo(() => {
    if (!state) return null;
    return {
      carPerf: Math.round(carPerformance(state)),
      costs: weeklyCosts(state),
      lineupRating: state.team.lineup
        .map((id) => (id ? driverRating(state.drivers[id]!) : 0))
        .reduce((a, b) => a + b, 0),
    };
  }, [state]);

  return {
    state,
    derived,
    screen,
    setScreen,
    settings,
    setSettings,
    saves,
    save,
    load,
    removeSave,
    newGame,
    notify,
    toast,
    actions,
    adminUnlocked,
    setAdminUnlocked,
    reset: () => {
      setState(null);
      setScreen("menu");
    },
  };
}

/** Rennergebnis in Saison, Statistik und Kasse verbuchen. */
function applyRaceResult(s: GameState, record: RaceRecord, notify: (m: string) => void) {
  s.season.races.push(record);
  for (const r of record.results) {
    s.season.standings[r.driverId] = (s.season.standings[r.driverId] ?? 0) + r.points;
    s.season.teamStandings[r.teamId] = (s.season.teamStandings[r.teamId] ?? 0) + r.points;
    const d = s.drivers[r.driverId];
    if (d) {
      d.stats.starts += 1;
      d.stats.points += r.points;
      if (r.position === 1) d.stats.wins += 1;
      if (r.position && r.position <= 3) d.stats.podiums += 1;
    }
    if (r.teamId === "player") {
      s.team.stats.points += r.points;
      if (r.position === 1) {
        s.team.stats.wins += 1;
        s.team.reputation = clamp(s.team.reputation + 4, 0, 100);
        s.team.history.push(`${s.season.year}: Sieg in ${record.trackName} (${r.driverName})`);
      } else if (r.position && r.position <= 3) {
        s.team.stats.podiums += 1;
        s.team.reputation = clamp(s.team.reputation + 2, 0, 100);
      } else if (r.position && r.position <= 10) {
        s.team.reputation = clamp(s.team.reputation + 1, 0, 100);
      }
    }
  }

  const income = raceIncome(s, record.results);
  s.team.money += income.sponsors + income.prize - weeklyCosts(s);

  // Forschungsfortschritt
  for (const key of Object.keys(s.team.research) as ResearchKey[]) {
    const r = s.team.research[key];
    if (!r.active) continue;
    r.progress += 25 + s.team.buildings.lab.level * 8 + (s.team.style === "engineering" ? 6 : 0);
    if (r.progress >= 100) {
      r.level += 1;
      r.progress = 0;
      r.active = false;
      notify(`Forschung abgeschlossen: ${key} Level ${r.level}`);
    }
  }

  // Verschleiß
  for (const p of Object.values(s.team.car.parts)) {
    p.reliability = clamp(p.reliability - 1.5, 1, 99);
  }

  s.season.round += 1;
  s.season.trainingDone = false;
  s.season.qualiDone = false;
  s.season.lastQualifying = null;

  if (s.season.round >= s.season.calendar.length) endSeason(s, notify);
}

function endSeason(s: GameState, notify: (m: string) => void) {
  const ranking = Object.entries(s.season.standings).sort((a, b) => b[1] - a[1]);
  const champ = ranking[0];
  if (champ) {
    const d = s.drivers[champ[0]];
    if (d) {
      d.stats.championships += 1;
      if (d.teamId === "player") {
        s.team.stats.championships += 1;
        s.team.history.push(`${s.season.year}: Fahrertitel für ${d.name}!`);
      }
    }
    notify(`Saison beendet – Champion: ${d?.name ?? "?"}`);
  }
  const bonus = Math.max(0, 3_000_000 - (ranking.findIndex(([id]) => s.team.lineup.includes(id)) + 1) * 150_000);
  s.team.money += bonus;
  s.team.stats.seasonsPlayed += 1;
  s.team.history.push(`${s.season.year}: Saison abgeschlossen (${s.team.stats.points} Punkte gesamt).`);

  // Neue Saison
  s.season = {
    year: s.season.year + 1,
    round: 0,
    calendar: s.season.calendar,
    standings: {},
    teamStandings: {},
    races: [],
    trainingDone: false,
    qualiDone: false,
    lastQualifying: null,
  };
  Object.values(s.drivers).forEach((d) => {
    d.age += 1;
    if (d.contractSeasons > 0) d.contractSeasons -= 1;
  });
  s.availableSponsors = Array.from({ length: 4 }, createSponsor);
  s.team.sponsorIds = [];
}

export const GameContext = createContext<ReturnType<typeof useGameEngine> | null>(null);
export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used inside GameContext");
  return ctx;
}
