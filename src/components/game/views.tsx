// Spielerbereich: Dashboard, Fahrer, Transfermarkt, Fahrzeug, Forschung, Gebäude, Sponsoren, Saison, Statistik.
import { useMemo, useState } from "react";
import {
  BUILDING_LABELS,
  PART_LABELS,
  RESEARCH_LABELS,
  TRACKS,
} from "@/game/data";
import {
  STAGE_LABELS,
  buildingCost,
  carPerformance,
  carReliability,
  driverRating,
  money,
  SPONSOR_TIER_LABELS,
  researchCost,
  trainingCost,
  upgradeCost,
  weeklyCosts,
} from "@/game/engine";
import { useGame } from "@/game/store";
import type { BuildingKey, Driver, GameState, PartKey, ResearchKey } from "@/game/types";
import { Avatar, Bar, Button, Chip, Field, Panel, Stat, inputClass } from "./ui";

const SKILL_LABELS: Record<string, string> = {
  speed: "Geschwindigkeit",
  cornering: "Kurvenfahren",
  braking: "Bremsen",
  overtaking: "Überholen",
  defending: "Verteidigen",
  wet: "Regenfähigkeit",
  consistency: "Konstanz",
  raceIQ: "Rennintelligenz",
  experience: "Erfahrung",
  talent: "Talent",
};

const TRAIT_LABELS: Record<string, string> = {
  motivation: "Motivation",
  confidence: "Selbstvertrauen",
  pressure: "Druckresistenz",
  popularity: "Beliebtheit",
  loyalty: "Teamtreue",
  aggression: "Aggressivität",
  mediaSkill: "Medienverhalten",
};

function teamName(s: GameState, id: string) {
  return id === "player" ? s.team.name : (s.aiTeams.find((t) => t.id === id)?.name ?? "Frei");
}

export function Dashboard() {
  const { state, setScreen } = useGame();
  const pos = useMemo(() => {
    if (!state) return 0;
    const ranking = Object.entries(state.season.teamStandings).sort((a, b) => b[1] - a[1]);
    const idx = ranking.findIndex(([id]) => id === "player");
    return idx >= 0 ? idx + 1 : state.aiTeams.length + 1;
  }, [state]);
  if (!state) return null;
  const s = state;
  const activeResearch = (Object.keys(s.team.research) as ResearchKey[]).filter((k) => s.team.research[k].active);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Kontostand" value={money(s.team.money)} hint={`Kosten/Rennen ${money(weeklyCosts(s))}`} />
        <Stat label="Teamruf" value={`${s.team.reputation}/100`} />
        <Stat label="Fahrzeugleistung" value={Math.round(carPerformance(s))} hint={`Zuverlässigkeit ${Math.round(carReliability(s))}%`} />
        <Stat label="Team-Platzierung" value={`P${pos}`} hint={`${s.season.teamStandings["player"] ?? 0} Punkte`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Nächstes Rennen" className="lg:col-span-2">
          <NextRaceCard />
        </Panel>
        <Panel title="Forschung" action={<Button variant="ghost" onClick={() => setScreen("research")}>Labor</Button>}>
          {activeResearch.length === 0 && <p className="text-sm text-muted-foreground">Kein Projekt aktiv.</p>}
          <div className="space-y-3">
            {activeResearch.map((k) => (
              <div key={k}>
                <div className="mb-1 flex justify-between text-xs">
                  <span>{RESEARCH_LABELS[k].label}</span>
                  <span className="text-muted-foreground">{s.team.research[k].progress}%</span>
                </div>
                <Bar value={s.team.research[k].progress} />
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Fahrerübersicht" action={<Button variant="ghost" onClick={() => setScreen("drivers")}>Verwalten</Button>}>
        <div className="grid gap-3 sm:grid-cols-2">
          {s.team.driverIds.map((id) => {
            const d = s.drivers[id]!;
            const inLineup = s.team.lineup.includes(id);
            return (
              <div key={id} className="flex items-center gap-3 rounded-lg bg-secondary/50 p-3">
                <Avatar initials={d.portrait} color={s.team.color} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-display font-bold">{d.name}</span>
                    {inLineup ? <Chip tone="primary">Start</Chip> : <Chip>Reserve</Chip>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {d.age} J. · {d.nationality} · Rating {driverRating(d)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}

export function NextRaceCard() {
  const { state, setScreen } = useGame();
  if (!state) return null;
  const trackId = state.season.calendar[state.season.round]!;
  const track = TRACKS.find((t) => t.id === trackId)!;
  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div>
        <div className="label-xs">
          Saison {state.season.year} · Rennen {state.season.round + 1}/{state.season.calendar.length}
        </div>
        <div className="font-display text-2xl font-black uppercase">{track.name}</div>
        <div className="text-sm text-muted-foreground">
          {track.country} · {track.laps} Runden
        </div>
        <div className="mt-2 flex gap-2">
          <Chip>{state.season.trainingDone ? "Training ✓" : "Training offen"}</Chip>
          <Chip>{state.season.qualiDone ? "Qualifying ✓" : "Qualifying offen"}</Chip>
        </div>
      </div>
      <Button onClick={() => setScreen("race")}>Zum Rennwochenende</Button>
    </div>
  );
}

export function DriversScreen() {
  const { state, actions } = useGame();
  const [compare, setCompare] = useState<string[]>([]);
  if (!state) return null;
  const s = state;

  const toggleCompare = (id: string) =>
    setCompare((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id].slice(-2)));

  return (
    <div className="space-y-4">
      <Panel title="Renneinsatz">
        <div className="grid gap-3 sm:grid-cols-2">
          {([0, 1] as const).map((slot) => (
            <Field key={slot} label={`Auto ${slot + 1}`}>
              <select
                className={inputClass}
                value={s.team.lineup[slot] ?? ""}
                onChange={(e) => actions.setLineup(slot, e.target.value || null)}
              >
                <option value="">– leer –</option>
                {s.team.driverIds.map((id) => (
                  <option key={id} value={id}>{s.drivers[id]?.name} ({driverRating(s.drivers[id]!)})</option>
                ))}
              </select>
            </Field>
          ))}
        </div>
      </Panel>

      {compare.length === 2 && (
        <Panel title="Fahrervergleich">
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div />
            {compare.map((id) => (
              <div key={id} className="font-display font-bold">{s.drivers[id]?.name}</div>
            ))}
            {Object.keys(SKILL_LABELS).map((k) => {
              const a = (s.drivers[compare[0]!]!.skills as unknown as Record<string, number>)[k]!;
              const b = (s.drivers[compare[1]!]!.skills as unknown as Record<string, number>)[k]!;
              return (
                <div key={k} className="col-span-3 grid grid-cols-3 items-center gap-2 border-t border-border py-1">
                  <span className="text-xs text-muted-foreground">{SKILL_LABELS[k]}</span>
                  <span className={a >= b ? "text-accent" : ""}>{a}</span>
                  <span className={b >= a ? "text-accent" : ""}>{b}</span>
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      <div className="grid gap-3 lg:grid-cols-2">
        {s.team.driverIds.map((id) => (
          <DriverCard
            key={id}
            driver={s.drivers[id]!}
            owned
            selected={compare.includes(id)}
            onCompare={() => toggleCompare(id)}
          />
        ))}
      </div>
    </div>
  );
}

function DriverCard({
  driver,
  owned,
  selected,
  onCompare,
}: {
  driver: Driver;
  owned?: boolean;
  selected?: boolean;
  onCompare?: () => void;
}) {
  const { state, actions } = useGame();
  const [skill, setSkill] = useState("speed");
  const [seasons, setSeasons] = useState(2);
  if (!state) return null;

  return (
    <div className={`panel p-4 ${selected ? "glow" : ""}`}>
      <div className="flex items-start gap-3">
        <Avatar initials={driver.portrait} color={owned ? state.team.color : undefined} />
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-display text-lg font-bold">{driver.name}</span>
            <Chip tone="accent">Rating {driverRating(driver)}</Chip>
            <Chip tone="primary">{STAGE_LABELS[driver.stage]}</Chip>
            {driver.legend && <Chip tone="accent">Legende</Chip>}
          </div>
          <div className="text-xs text-muted-foreground">
            {driver.age} Jahre · {driver.nationality} · Marktwert {money(driver.marketValue)} · Gehalt{" "}
            {money(driver.salary)}/Saison
            {owned && ` · Vertrag ${driver.contractSeasons} Saison(s)`}
          </div>
          <div className="text-xs text-muted-foreground">
            {driver.traits.personality} · Höhepunkt {driver.peakAge} J. · Form {Math.round(driver.form)}
          </div>
        </div>
      </div>

      <div className="mt-3 grid gap-x-4 gap-y-1 sm:grid-cols-2">
        {Object.entries(driver.skills).map(([k, v]) => (
          <div key={k}>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">{SKILL_LABELS[k] ?? k}</span>
              <span>{Math.round(v)}</span>
            </div>
            <Bar value={v} tone={v > 75 ? "speed" : "muted"} />
          </div>
        ))}
      </div>

      <div className="mt-3 grid gap-x-4 gap-y-1 sm:grid-cols-2">
        {Object.entries(TRAIT_LABELS).map(([k, label]) => {
          const v = (driver.traits as unknown as Record<string, number>)[k] ?? 0;
          return (
            <div key={k}>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{label}</span>
                <span>{Math.round(v)}</span>
              </div>
              <Bar value={v} tone="muted" />
            </div>
          );
        })}
      </div>

      {(driver.rivalIds.length > 0 || driver.friendIds.length > 0) && (
        <div className="mt-2 flex flex-wrap gap-1 text-xs text-muted-foreground">
          {driver.rivalIds.slice(0, 3).map((id) => (
            <span key={id} className="rounded bg-destructive/20 px-2 py-0.5">Rivale: {state.drivers[id]?.name}</span>
          ))}
          {driver.friendIds.slice(0, 3).map((id) => (
            <span key={id} className="rounded bg-accent/20 px-2 py-0.5">Freund: {state.drivers[id]?.name}</span>
          ))}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-end gap-2">
        {owned ? (
          <>
            <Field label="Training">
              <select className={inputClass} value={skill} onChange={(e) => setSkill(e.target.value)}>
                {Object.keys(SKILL_LABELS).map((k) => <option key={k} value={k}>{SKILL_LABELS[k]}</option>)}
              </select>
            </Field>
            <Button onClick={() => actions.trainDriver(driver.id, skill as never)}>
              Trainieren ({money(trainingCost(state))})
            </Button>
            <Button variant="ghost" onClick={onCompare}>{selected ? "Vergleich ✓" : "Vergleichen"}</Button>
            <Button variant="danger" onClick={() => actions.releaseDriver(driver.id)}>Entlassen</Button>
          </>
        ) : (
          <>
            <Field label="Vertragslaufzeit">
              <select className={inputClass} value={seasons} onChange={(e) => setSeasons(Number(e.target.value))}>
                {[1, 2, 3].map((n) => <option key={n} value={n}>{n} Saison(s)</option>)}
              </select>
            </Field>
            <Button onClick={() => actions.signDriver(driver.id, seasons)}>
              Verpflichten ({money(Math.round(driver.marketValue * 0.15))})
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

export function MarketScreen() {
  const { state } = useGame();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"rating" | "value" | "age">("rating");
  if (!state) return null;
  const s = state;

  const list = s.freeAgents
    .map((id) => s.drivers[id]!)
    .filter(Boolean)
    .filter((d) => d.name.toLowerCase().includes(query.toLowerCase()) || d.nationality.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) =>
      sort === "rating" ? driverRating(b) - driverRating(a) : sort === "value" ? a.marketValue - b.marketValue : a.age - b.age,
    )
    .slice(0, 30);

  return (
    <div className="space-y-4">
      <Panel title="Transfermarkt">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Suche">
            <input className={inputClass} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name oder Land" />
          </Field>
          <Field label="Sortierung">
            <select className={inputClass} value={sort} onChange={(e) => setSort(e.target.value as typeof sort)}>
              <option value="rating">Bestes Rating</option>
              <option value="value">Günstigster Marktwert</option>
              <option value="age">Jüngste Fahrer</option>
            </select>
          </Field>
          <div className="self-end text-xs text-muted-foreground">
            {s.freeAgents.length} freie Fahrer · Kader {s.team.driverIds.length}/4
          </div>
        </div>
      </Panel>
      <div className="grid gap-3 lg:grid-cols-2">
        {list.map((d) => <DriverCard key={d.id} driver={d} />)}
      </div>
    </div>
  );
}

export function CarScreen() {
  const { state, actions } = useGame();
  if (!state) return null;
  const s = state;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="Fahrzeug" value={s.team.car.name} />
        <Stat label="Gesamtleistung" value={Math.round(carPerformance(s))} />
        <Stat label="Zuverlässigkeit" value={`${Math.round(carReliability(s))}%`} />
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        {(Object.keys(PART_LABELS) as PartKey[]).map((p) => {
          const part = s.team.car.parts[p];
          const cost = upgradeCost(s, p);
          return (
            <Panel key={p} title={`${PART_LABELS[p]} · Lv ${part.level}`}>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-xs"><span className="text-muted-foreground">Leistung</span><span>{Math.round(part.performance)}</span></div>
                  <Bar value={part.performance} />
                </div>
                <div>
                  <div className="flex justify-between text-xs"><span className="text-muted-foreground">Zuverlässigkeit</span><span>{Math.round(part.reliability)}%</span></div>
                  <Bar value={part.reliability} tone="muted" />
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button disabled={s.team.money < cost} onClick={() => actions.upgradePart(p)}>
                  Ausbauen ({money(cost)})
                </Button>
                <Button variant="ghost" onClick={() => actions.reliabilityPass(p)}>
                  Überholung ({money(Math.round(cost * 0.6))})
                </Button>
              </div>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}

export function ResearchScreen() {
  const { state, actions } = useGame();
  if (!state) return null;
  const s = state;
  return (
    <div className="space-y-4">
      <Panel title="Forschungslabor">
        <p className="text-sm text-muted-foreground">
          Labor-Level {s.team.buildings.lab.level} · Fortschritt pro Rennen:{" "}
          {25 + s.team.buildings.lab.level * 8}%
        </p>
      </Panel>
      <div className="grid gap-3 lg:grid-cols-2">
        {(Object.keys(RESEARCH_LABELS) as ResearchKey[]).map((k) => {
          const r = s.team.research[k];
          const cost = researchCost(s, k);
          return (
            <Panel key={k} title={`${RESEARCH_LABELS[k].label} · Lv ${r.level}`}>
              <p className="mb-2 text-xs text-muted-foreground">Verbessert: {RESEARCH_LABELS[k].effect}</p>
              <Bar value={r.progress} />
              <div className="mt-3 flex items-center gap-2">
                <Button disabled={r.active || s.team.money < cost} onClick={() => actions.startResearch(k)}>
                  {r.active ? `Läuft (${r.progress}%)` : `Starten (${money(cost)})`}
                </Button>
              </div>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}

export function BuildingsScreen() {
  const { state, actions } = useGame();
  if (!state) return null;
  const s = state;
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {(Object.keys(BUILDING_LABELS) as BuildingKey[]).map((b) => {
        const cost = buildingCost(s, b);
        const lvl = s.team.buildings[b].level;
        return (
          <Panel key={b} title={`${BUILDING_LABELS[b].label} · Lv ${lvl}`}>
            <p className="mb-2 text-xs text-muted-foreground">Verbessert: {BUILDING_LABELS[b].effect}</p>
            <Bar value={lvl * 10} />
            <Button className="mt-3" disabled={s.team.money < cost} onClick={() => actions.upgradeBuilding(b)}>
              Ausbauen ({money(cost)})
            </Button>
          </Panel>
        );
      })}
    </div>
  );
}

export function SponsorsScreen() {
  const { state, actions } = useGame();
  if (!state) return null;
  const s = state;
  const slotsLeft = 3 - s.team.sponsorIds.length;
  return (
    <div className="space-y-4">
      <Panel title={`Aktive Sponsoren · ${s.team.sponsorIds.length}/3`}>
        {s.team.sponsorIds.length === 0 && <p className="text-sm text-muted-foreground">Noch keine Verträge.</p>}
        <div className="grid gap-2 sm:grid-cols-3">
          {s.team.sponsorIds.map((id) => {
            const sp = s.availableSponsors.find((x) => x.id === id);
            if (!sp) return null;
            return (
              <div key={id} className="rounded-lg bg-secondary/50 p-3">
                <div className="font-display font-bold">{sp.name}</div>
                <div className="text-xs text-muted-foreground">{money(sp.perRace)} pro Rennen</div>
                <div className="text-xs text-muted-foreground">Ziel: {sp.requirement.label}</div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Maximal 3 Verträge gleichzeitig · {slotsLeft} Platz/Plätze frei. Der Markt wechselt nach den Rennen: Angebote
          verschwinden, neue – bessere oder schlechtere – kommen dazu.
        </p>
      </Panel>
      <div className="grid gap-3 lg:grid-cols-2">
        {s.availableSponsors
          .filter((sp) => !s.team.sponsorIds.includes(sp.id))
          .map((sp) => {
            const repOk = s.team.reputation >= sp.minReputation;
            const winOk = s.team.stats.wins >= sp.minWins;
            const locked = !repOk || !winOk || slotsLeft <= 0;
            return (
              <Panel key={sp.id} title={sp.name}>
                <div className="mb-2 flex flex-wrap gap-2">
                  <Chip tone={sp.tier === "global" ? "primary" : sp.tier === "regional" ? undefined : "accent"}>
                    {SPONSOR_TIER_LABELS[sp.tier]}
                  </Chip>
                  {!repOk && <Chip>Ruf {sp.minReputation} nötig</Chip>}
                  {!winOk && <Chip>{sp.minWins} Siege nötig</Chip>}
                </div>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>Antrittsbonus: {money(sp.signingBonus)}</li>
                  <li>Pro Rennen: {money(sp.perRace)}</li>
                  <li>Saisonziel: {sp.requirement.label}</li>
                  <li>Zielbonus: {money(sp.reward)}</li>
                  <li>
                    Bedingungen: Ruf ≥ {sp.minReputation} · Siege ≥ {sp.minWins}
                  </li>
                </ul>
                <Button className="mt-3" disabled={locked} onClick={() => actions.signSponsor(sp.id)}>
                  {slotsLeft <= 0 ? "Keine Slots frei" : locked ? "Bedingungen offen" : "Vertrag unterschreiben"}
                </Button>
              </Panel>
            );
          })}
      </div>
    </div>
  );
}


export function SeasonScreen() {
  const { state } = useGame();
  if (!state) return null;
  const s = state;
  const driverStandings = Object.entries(s.season.standings)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15);
  const teamStandings = Object.entries(s.season.teamStandings).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-4">
      <Panel title={`Rennkalender ${s.season.year}`}>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {s.season.calendar.map((id, i) => {
            const t = TRACKS.find((x) => x.id === id)!;
            const done = i < s.season.round;
            return (
              <div
                key={id}
                className={`rounded-lg border px-3 py-2 ${i === s.season.round ? "border-primary bg-primary/10" : "border-border bg-secondary/40"}`}
              >
                <div className="label-xs">Runde {i + 1}</div>
                <div className="font-display font-bold">{t.name}</div>
                <div className="text-xs text-muted-foreground">
                  {t.country} {done ? "· beendet" : i === s.season.round ? "· nächstes" : ""}
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Fahrerwertung">
          <table className="w-full text-sm">
            <tbody>
              {driverStandings.map(([id, pts], i) => (
                <tr key={id} className="border-b border-border/60">
                  <td className="w-8 py-1 text-muted-foreground">{i + 1}</td>
                  <td className="py-1">{s.drivers[id]?.name ?? "?"}</td>
                  <td className="py-1 text-xs text-muted-foreground">{teamName(s, s.drivers[id]?.teamId ?? "")}</td>
                  <td className="py-1 text-right font-bold">{pts}</td>
                </tr>
              ))}
              {driverStandings.length === 0 && (
                <tr><td className="py-2 text-muted-foreground">Noch keine Ergebnisse.</td></tr>
              )}
            </tbody>
          </table>
        </Panel>
        <Panel title="Teamwertung">
          <table className="w-full text-sm">
            <tbody>
              {teamStandings.map(([id, pts], i) => (
                <tr key={id} className={`border-b border-border/60 ${id === "player" ? "text-accent" : ""}`}>
                  <td className="w-8 py-1 text-muted-foreground">{i + 1}</td>
                  <td className="py-1">{teamName(s, id)}</td>
                  <td className="py-1 text-right font-bold">{pts}</td>
                </tr>
              ))}
              {teamStandings.length === 0 && (
                <tr><td className="py-2 text-muted-foreground">Noch keine Ergebnisse.</td></tr>
              )}
            </tbody>
          </table>
        </Panel>
      </div>

      {s.season.races.length > 0 && (
        <Panel title="Ergebnisse">
          <div className="space-y-3">
            {[...s.season.races].reverse().map((r) => (
              <div key={r.round}>
                <div className="label-xs">Runde {r.round} · {r.trackName}</div>
                <div className="text-sm">
                  {r.results.slice(0, 3).map((x, i) => (
                    <span key={x.driverId} className="mr-3">{i + 1}. {x.driverName}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}

export function StatsScreen() {
  const { state } = useGame();
  if (!state) return null;
  const s = state;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Siege" value={s.team.stats.wins} />
        <Stat label="Podien" value={s.team.stats.podiums} />
        <Stat label="Pole Positions" value={s.team.stats.poles} />
        <Stat label="Punkte" value={s.team.stats.points} />
        <Stat label="Titel" value={s.team.stats.championships} />
      </div>
      <Panel title="Fahrerstatistiken">
        <table className="w-full text-sm">
          <thead>
            <tr className="label-xs text-left">
              <th className="py-1">Fahrer</th><th>Starts</th><th>Siege</th><th>Podien</th><th>Poles</th><th>Punkte</th>
            </tr>
          </thead>
          <tbody>
            {s.team.driverIds.map((id) => {
              const d = s.drivers[id]!;
              return (
                <tr key={id} className="border-t border-border/60">
                  <td className="py-1">{d.name}</td>
                  <td>{d.stats.starts}</td><td>{d.stats.wins}</td><td>{d.stats.podiums}</td>
                  <td>{d.stats.poles}</td><td>{d.stats.points}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Panel>
      <Panel title="Teamhistorie">
        <ul className="space-y-1 text-sm text-muted-foreground">
          {s.team.history.map((h, i) => <li key={i}>• {h}</li>)}
        </ul>
      </Panel>
    </div>
  );
}
