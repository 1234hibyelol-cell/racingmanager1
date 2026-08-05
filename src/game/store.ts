// Zentraler Spielzustand + Aktionen (React-Adapter über die reine Engine).
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  BUILDINGS,
  buildingCost,
  carPerformance,
  commercialIncome,
  createCar,
  createDriver,
  createEvent,
  createNewGame,
  createSponsor,
  INVESTOR_MAX,
  investorRequirement,
  createStaff,
  clamp,
  devCost,
  driverRating,
  getTrack,
  makeWeather,
  raceIncome,
  researchCost,
  simulateQualifying,
  simulateRace,
  staffCosts,
  trainingCost,
  uid,
  upgradeCost,
  weeklyCosts,
  type DevAction,
  type NewGameOptions,
  type RaceOutcome,
} from "./engine";
import { PARTS } from "./engine";
import {
  addRaceReactions,
  applyMediaOption,
  developDriver,
  pushNews,
  refreshGeneration,
  runYouthRace,
  scoutYouth,
  simulateWorldTick,
  trainYouth,
  updateRecords,
  updateRelations,
} from "./world";
import { AUTO_SLOT, deleteSave, listSaves, loadGame, saveGame, type SaveMeta } from "./save";
import { PREMIUM_ITEMS } from "./data";
import type {
  BuildingKey,
  Championship,
  CustomTrack,
  GameState,
  PartKey,
  RaceRecord,
  ResearchKey,
  StaffRole,
  Strategy,
  TeamDesign,
  WeatherKind,
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
  | "staff"
  | "academy"
  | "development"
  | "design"
  | "championships"
  | "media"
  | "finance"
  | "events"
  | "world"
  | "profile"
  | "shop"
  | "premium"
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
          if (s.team.sponsorIds.includes(id)) return;
          if (s.team.sponsorIds.length >= 3) return notify("Maximal 3 Sponsoren gleichzeitig.") as undefined;
          if (s.team.reputation < sp.minReputation)
            return notify(`${sp.name} verlangt Ruf ${sp.minReputation} (aktuell ${s.team.reputation}).`) as undefined;
          if (s.team.stats.wins < sp.minWins)
            return notify(`${sp.name} verlangt ${sp.minWins} Siege (aktuell ${s.team.stats.wins}).`) as undefined;
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
      /* --- Bauphase 2 --- */
      hireStaff(id: string) {
        patch((s) => {
          const st = s.staff[id];
          if (!st) return;
          if (s.team.staffIds.length >= 12) return notify("Personalgrenze erreicht (12).") as undefined;
          const fee = Math.round(st.salary * 0.25);
          if (!spend(s, fee)) return notify("Nicht genug Budget.") as undefined;
          st.teamId = "player";
          s.team.staffIds.push(id);
          s.staffMarket = s.staffMarket.filter((x) => x !== id);
          notify(`${st.name} verstärkt das Team.`);
        });
      },
      fireStaff(id: string) {
        patch((s) => {
          const st = s.staff[id];
          if (!st) return;
          st.teamId = null;
          s.team.staffIds = s.team.staffIds.filter((x) => x !== id);
          s.staffMarket.unshift(id);
          s.team.money -= Math.round(st.salary * 0.3);
          notify(`${st.name} verlässt das Team.`);
        });
      },
      recruitStaff(role: StaffRole) {
        patch((s) => {
          const st = createStaff(role);
          s.staff[st.id] = st;
          s.staffMarket.unshift(st.id);
          notify(`Neue Bewerbung: ${st.name} (${role}).`);
        });
      },
      scoutYouth() {
        patch((s) => {
          if (!spend(s, 150_000)) return notify("Nicht genug Budget.") as undefined;
          const d = scoutYouth(s);
          notify(`Talent entdeckt: ${d.name}`);
        });
      },
      trainYouth(id: string) {
        patch((s) => {
          if (!spend(s, 60_000)) return notify("Nicht genug Budget.") as undefined;
          const gain = trainYouth(s, id);
          notify(`Nachwuchstraining: +${gain.toFixed(1)} auf alle Fähigkeiten.`);
        });
      },
      signYouth(id: string) {
        patch((s) => {
          if (!s.team.academyIds.includes(id)) s.team.academyIds.push(id);
          s.youthProspects = s.youthProspects.filter((x) => x !== id);
          const d = s.drivers[id];
          if (d) {
            d.academy = true;
            d.teamId = "academy";
            notify(`${d.name} in die Akademie aufgenommen.`);
          }
        });
      },
      promoteYouth(id: string) {
        patch((s) => {
          const d = s.drivers[id];
          if (!d) return;
          if (s.team.driverIds.length >= 4) return notify("Kader ist voll (max. 4).") as undefined;
          d.academy = false;
          d.teamId = "player";
          d.contractSeasons = 3;
          s.team.academyIds = s.team.academyIds.filter((x) => x !== id);
          s.team.driverIds.push(id);
          if (!s.team.lineup[0]) s.team.lineup[0] = id;
          else if (!s.team.lineup[1]) s.team.lineup[1] = id;
          pushNews(s, `${d.name} steigt aus der Akademie ins Renneam auf.`, "talent");
          notify(`${d.name} befördert.`);
        });
      },
      runYouthRace() {
        patch((s) => {
          if (!spend(s, 120_000)) return notify("Nicht genug Budget.") as undefined;
          const table = runYouthRace(s);
          notify(table[0] ? `Nachwuchsrennen: ${table[0].name} gewinnt.` : "Keine Teilnehmer.");
        });
      },
      development(action: DevAction, part?: PartKey) {
        if (!state) return;
        const cost = devCost(state, action);
        patch((s) => {
          if (!spend(s, cost)) return notify("Nicht genug Budget.") as undefined;
          const dev = s.team.development;
          const eng = s.team.buildings.windTunnel.level;
          if (action === "windTunnel") {
            dev.windTunnelData = clamp(dev.windTunnelData + 12 + eng * 3, 0, 100);
            notify(`Windkanaldaten: ${Math.round(dev.windTunnelData)}%`);
          } else if (action === "simulation") {
            dev.simulationData = clamp(dev.simulationData + 10 + s.team.buildings.lab.level * 2, 0, 100);
            notify(`Simulationsdaten: ${Math.round(dev.simulationData)}%`);
          } else if (action === "prototype") {
            const target = part ?? PARTS[0]!;
            const quality = clamp((dev.windTunnelData + dev.simulationData) / 2 + Math.random() * 20, 5, 100);
            dev.prototypes.push({ id: uid("pro"), part: target, quality: Math.round(quality), tested: false });
            dev.windTunnelData = clamp(dev.windTunnelData - 30, 0, 100);
            dev.simulationData = clamp(dev.simulationData - 20, 0, 100);
            if (Math.random() < 0.25) {
              dev.flaws.push({ id: uid("flw"), part: target, label: "Entwicklungsfehler entdeckt", penalty: 2 });
              notify("Prototyp gebaut – aber ein Entwicklungsfehler schleicht sich ein.");
            } else notify(`Prototyp gebaut (Qualität ${Math.round(quality)}).`);
          } else if (action === "testDrive") {
            dev.testKm += 300;
            dev.setup = clamp(dev.setup + 6 + s.team.buildings.simulator.level * 2, 0, 100);
            const proto = dev.prototypes.find((p) => !p.tested);
            if (proto) {
              proto.tested = true;
              const p = s.team.car.parts[proto.part];
              if (p) {
                p.performance = clamp(p.performance + proto.quality / 12, 1, 100);
                p.level += 1;
              }
              notify(`Testfahrt: Prototyp ${proto.part} eingebaut.`);
            } else notify("Testfahrt absolviert: Setup verbessert.");
          } else {
            const fixed = dev.flaws.shift();
            for (const key of PARTS) {
              const p = s.team.car.parts[key];
              if (p) p.reliability = clamp(p.reliability + 1.5, 1, 99);
            }
            notify(fixed ? "Zuverlässigkeitstest: Entwicklungsfehler behoben." : "Zuverlässigkeitstest: alles im grünen Bereich.");
          }
        });
      },
      setDesign(patchDesign: Partial<TeamDesign>) {
        patch((s) => {
          s.team.design = { ...s.team.design, ...patchDesign };
          if (patchDesign.primary) s.team.color = patchDesign.primary;
          if (patchDesign.logo) s.team.logo = patchDesign.logo;
        });
      },
      setDriverGear(id: string, gear: Partial<GameState["drivers"][string]["gear"]>) {
        patch((s) => {
          const d = s.drivers[id];
          if (d) d.gear = { ...d.gear, ...gear };
        });
      },
      createChampionship(c: Omit<Championship, "id" | "custom">) {
        patch((s) => {
          const champ: Championship = { ...c, id: uid("chp"), custom: true };
          s.championships.push(champ);
          notify(`Meisterschaft erstellt: ${champ.name}`);
        });
      },
      deleteChampionship(id: string) {
        patch((s) => {
          s.championships = s.championships.filter((c) => c.id !== id);
          if (s.activeChampionshipId === id) s.activeChampionshipId = s.championships[0]?.id ?? null;
        });
      },
      activateChampionship(id: string) {
        patch((s) => {
          const c = s.championships.find((x) => x.id === id);
          if (!c) return;
          s.activeChampionshipId = id;
          s.season.calendar = c.calendar.length ? c.calendar : s.season.calendar;
          s.season.round = 0;
          s.season.standings = {};
          s.season.teamStandings = {};
          s.season.races = [];
          notify(`${c.name} ist jetzt aktive Serie.`);
        });
      },
      answerMedia(eventId: string, optionId: string) {
        patch((s) => notify(applyMediaOption(s, eventId, optionId)) as undefined);
      },
      finance(field: "merchLevel" | "ticketLevel" | "marketing" | "factory" | "investors", delta: number) {
        patch((s) => {
          const f = s.team.finance;
          if (delta > 0) {
            if (field === "investors") {
              if (f.investors >= INVESTOR_MAX) return notify("Maximal 3 Investoren – der Rest gehört dir.") as undefined;
              const need = investorRequirement(f.investors);
              if (s.team.reputation < need.reputation)
                return notify(`Investor verlangt Ruf ${need.reputation} (aktuell ${s.team.reputation}).`) as undefined;
              if (s.team.stats.podiums < need.podiums)
                return notify(`Investor verlangt ${need.podiums} Podien (aktuell ${s.team.stats.podiums}).`) as undefined;
              s.team.money += need.capital;
              f.investors += 1;
              notify(`Investor aufgenommen: +${need.capital.toLocaleString("de-DE")} €.`);
              return;
            }
            if (!spend(s, 500_000)) return notify("Nicht genug Budget.") as undefined;
          }
          f[field] = Math.max(0, f[field] + delta);
          notify("Wirtschaftsplan angepasst.");
        });
      },

      enterEvent(id: string) {
        if (!state) return;
        patch((s) => {
          const ev = s.events.find((e) => e.id === id);
          if (!ev || ev.done) return;
          if (!spend(s, ev.entryFee)) return notify("Startgeld reicht nicht.") as undefined;
          const out = simulateRace(s, "normal", ev.trackId);
          const best = out.record.results.find((r) => r.teamId === "player");
          const placed = best?.position ?? 20;
          const reward = Math.round(ev.reward * Math.max(0.2, 1 - (placed - 1) * 0.06));
          s.team.money += reward;
          s.team.reputation = clamp(s.team.reputation + (placed <= 3 ? ev.reputation : 1), 0, 100);
          ev.done = true;
          pushNews(s, `${ev.name}: P${placed} für ${s.team.name} (${reward.toLocaleString("de-DE")} €).`, "event");
          notify(`${ev.name} beendet – P${placed}, Prämie ${reward.toLocaleString("de-DE")} €`);
        });
      },
      buyPremium(itemId: string) {
        patch((s) => {
          const item = PREMIUM_ITEMS.find((i) => i.id === itemId);
          if (!item) return;
          if (s.premium.owned.includes(itemId)) return notify("Bereits im Besitz.") as undefined;
          if (s.premium.credits < item.price) return notify("Nicht genug Credits.") as undefined;
          s.premium.credits -= item.price;
          s.premium.owned.push(itemId);
          if (item.id === "cmf_slots") s.premium.saveSlots += 4;
          if (item.id === "cmf_stats") s.premium.advancedStats = true;
          if (item.kind === "theme") s.premium.theme = item.name;
          notify(`${item.name} freigeschaltet.`);
        });
      },
      addCredits(n: number) {
        patch((s) => void (s.premium.credits += n));
      },
      /* Admin */
      admin: {
        createStaff: (role: StaffRole) =>
          patch((s) => {
            const st = createStaff(role, 92);
            s.staff[st.id] = st;
            s.staffMarket.unshift(st.id);
            notify(`Top-Mitarbeiter erstellt: ${st.name}`);
          }),
        setWeather: (kind: WeatherKind) =>
          patch((s) => {
            s.weather = { ...s.weather, kind, locked: true };
            notify(`Wetter festgelegt: ${kind}`);
          }),
        unlockWeather: () => patch((s) => void (s.weather.locked = false)),
        createTrack: (t: Omit<CustomTrack, "id">) =>
          patch((s) => {
            const track: CustomTrack = { ...t, id: uid("trk") };
            s.customTracks.push(track);
            s.season.calendar.push(track.id);
            notify(`Strecke erstellt: ${track.name}`);
          }),
        startEvent: (kind: "winter" | "summer" | "special" | "historic" | "community") =>
          patch((s) => {
            s.events.unshift(createEvent(kind));
            notify("Event gestartet.");
          }),
        createTeam: (name: string, color: string, strength: number) =>
          patch((s) => {
            s.aiTeams.push({ id: uid("ai"), name, color, strength: clamp(strength, 30, 99), driverIds: [], development: 1 });
            notify(`Team erstellt: ${name}`);
          }),
        editTeam: (id: string, field: "name" | "color" | "strength", value: string | number) =>
          patch((s) => {
            const t = s.aiTeams.find((x) => x.id === id);
            if (!t) return;
            if (field === "strength") t.strength = clamp(Number(value), 30, 99);
            else if (field === "name") t.name = String(value);
            else t.color = String(value);
          }),
        rerollSponsors: () => patch((s) => void (s.availableSponsors = Array.from({ length: 4 }, createSponsor))),
        resetSeason: () =>
          patch((s) => {
            s.season.round = 0;
            s.season.standings = {};
            s.season.teamStandings = {};
            s.season.races = [];
            s.season.trainingDone = false;
            s.season.qualiDone = false;
            s.season.lastQualifying = null;
            notify("Saison zurückgesetzt.");
          }),
        grantReward: (money: number, credits: number, reputation: number) =>
          patch((s) => {
            s.team.money += money;
            s.premium.credits += credits;
            s.team.reputation = clamp(s.team.reputation + reputation, 0, 100);
            notify("Belohnung vergeben.");
          }),
        newCar: () => patch((s) => void (s.team.car = createCar(s.team.car.name))),
        editDriver: (id: string, field: "name" | "age" | "nationality" | "salary" | "marketValue", value: string | number) =>
          patch((s) => {
            const d = s.drivers[id];
            if (!d) return;
            if (field === "name") d.name = String(value);
            else if (field === "nationality") d.nationality = String(value);
            else d[field] = Number(value);
          }),
        setTrait: (id: string, trait: string, value: number) =>
          patch((s) => {
            const d = s.drivers[id];
            if (d && trait in d.traits) (d.traits as unknown as Record<string, number>)[trait] = clamp(value);
          }),
        worldTick: () =>
          patch((s) => {
            simulateWorldTick(s);
            notify("Welt-Simulation ausgeführt.");
          }),
        ageSeason: () =>
          patch((s) => {
            Object.values(s.drivers).forEach((d) => developDriver(s, d));
            refreshGeneration(s);
            updateRecords(s);
            notify("Ein Jahr Motorsport-Welt simuliert.");
          }),

        addMoney: (amount: number) => patch((s) => void (s.team.money += amount)),
        setSkill: (id: string, skill: string, value: number) =>
          patch((s) => {
            const d = s.drivers[id];
            if (d) (d.skills as unknown as Record<string, number>)[skill] = clamp(value);
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
  const comm = commercialIncome(s);
  const costs = weeklyCosts(s);
  const net = income.sponsors + income.prize + comm.tv + comm.merch + comm.tickets + comm.investors - costs;
  s.team.money += net;
  s.team.finance.lastReport = {
    round: record.round,
    sponsors: income.sponsors,
    prize: income.prize,
    tv: comm.tv,
    merch: comm.merch,
    tickets: comm.tickets,
    investors: comm.investors,
    salaries: Math.round(s.team.driverIds.reduce((x, id) => x + (s.drivers[id]?.salary ?? 0) / 12, 0)),
    staff: staffCosts(s),
    facilities: Object.values(s.team.buildings).reduce((x, b) => x + b.level * 40_000, 0),
    marketing: s.team.finance.marketing * 70_000,
    travel: s.team.finance.travelCost,
    net,
  };

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
  s.team.development.setup = clamp(s.team.development.setup - 8, 0, 100);

  // Welt, Medien, Beziehungen
  const bestPlayer = record.results
    .filter((r) => r.teamId === "player" && r.position)
    .map((r) => r.position!)
    .sort((a, b) => a - b)[0] ?? null;
  updateRelations(s, record.results.map((r) => ({ driverId: r.driverId, position: r.position })));
  addRaceReactions(s, bestPlayer);
  simulateWorldTick(s);
  s.profile.xp += 60 + (bestPlayer ? Math.max(0, 30 - bestPlayer * 2) : 0);
  if (s.profile.xp >= s.profile.level * 500) {
    s.profile.level += 1;
    s.profile.xp = 0;
  }
  s.profile.rating += bestPlayer && bestPlayer <= 5 ? 12 : -6;

  s.season.round += 1;
  s.season.trainingDone = false;
  s.season.qualiDone = false;
  s.season.lastQualifying = null;

  if (s.season.round < s.season.calendar.length && !s.weather.locked) {
    s.weather = makeWeather(getTrack(s, s.season.calendar[s.season.round]!));
  }

  if (s.season.round >= s.season.calendar.length) endSeason(s, notify);
}

function endSeason(s: GameState, notify: (m: string) => void) {
  const ranking = Object.entries(s.season.standings).sort((a, b) => b[1] - a[1]);
  const champ = ranking[0];
  let championName = "–";
  if (champ) {
    const d = s.drivers[champ[0]];
    if (d) {
      championName = d.name;
      d.stats.championships += 1;
      if (d.teamId === "player") {
        s.team.stats.championships += 1;
        s.team.history.push(`${s.season.year}: Fahrertitel für ${d.name}!`);
      }
    }
    notify(`Saison beendet – Champion: ${d?.name ?? "?"}`);
  }
  const playerPos = ranking.findIndex(([id]) => s.team.lineup.includes(id)) + 1;
  const bonus = Math.max(0, 3_000_000 - playerPos * 150_000);
  s.team.money += bonus;
  s.team.stats.seasonsPlayed += 1;
  s.team.history.push(`${s.season.year}: Saison abgeschlossen (${s.team.stats.points} Punkte gesamt).`);

  const teamRanking = Object.entries(s.season.teamStandings).sort((a, b) => b[1] - a[1]);
  const champTeamId = teamRanking[0]?.[0] ?? "";
  s.world.archive.unshift({
    year: s.season.year,
    championDriver: championName,
    championTeam: champTeamId === "player" ? s.team.name : (s.aiTeams.find((t) => t.id === champTeamId)?.name ?? "–"),
    playerPoints: s.season.teamStandings["player"] ?? 0,
    playerPosition: Math.max(1, teamRanking.findIndex(([id]) => id === "player") + 1),
  });
  pushNews(s, `${s.season.year}: ${championName} gewinnt die Meisterschaft.`, "record");

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

  // Fahrer-Lebenszyklus & Generationswechsel
  Object.values(s.drivers).forEach((d) => {
    if (d.contractSeasons > 0) d.contractSeasons -= 1;
    developDriver(s, d);
  });
  refreshGeneration(s);
  updateRecords(s);

  s.availableSponsors = Array.from({ length: 4 }, createSponsor);
  s.team.sponsorIds = [];
  s.events = s.events.map((e) => ({ ...e, done: false }));
  if (!s.weather.locked) s.weather = makeWeather(getTrack(s, s.season.calendar[0]!));
}


export const GameContext = createContext<ReturnType<typeof useGameEngine> | null>(null);
export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used inside GameContext");
  return ctx;
}
