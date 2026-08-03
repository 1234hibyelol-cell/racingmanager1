// Rennwochenende: Training, Qualifying, Strategie, Simulation mit Überspringen-Buttons.
import { useEffect, useRef, useState } from "react";
import { TRACKS, TRACK_KIND_LABELS, WEATHER_LABELS } from "@/game/data";
import { carPerformance, carReliability, driverRating, money } from "@/game/engine";
import { useGame } from "@/game/store";
import type { RaceRecord, Strategy } from "@/game/types";
import { Bar, Button, Chip, Panel, Stat } from "./ui";

const STRATEGIES: { id: Strategy; label: string; desc: string }[] = [
  { id: "aggressive", label: "Aggressiv", desc: "Mehr Pace, höheres Ausfallrisiko" },
  { id: "normal", label: "Normal", desc: "Ausgewogene Rennführung" },
  { id: "safe", label: "Sicher", desc: "Weniger Pace, hohe Zuverlässigkeit" },
];

export function RaceScreen() {
  const { state, actions, settings, setScreen } = useGame();
  const [strategy, setStrategy] = useState<Strategy>("normal");
  const [record, setRecord] = useState<RaceRecord | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [visibleLog, setVisibleLog] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!log.length) return;
    if (settings.skipAnimations) {
      setVisibleLog(log.length);
      return;
    }
    setVisibleLog(1);
    timer.current = setInterval(() => {
      setVisibleLog((v) => {
        if (v >= log.length) {
          if (timer.current) clearInterval(timer.current);
          return v;
        }
        return v + 1;
      });
    }, 550);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [log, settings.skipAnimations]);

  if (!state) return null;
  const s = state;
  const track = TRACKS.find((t) => t.id === s.season.calendar[s.season.round])!;
  const lineup = s.team.lineup.filter(Boolean) as string[];

  const runRace = () => {
    const out = actions.runRace(strategy);
    if (out) {
      setRecord(out.record);
      setLog(out.log);
    }
  };

  const weather = WEATHER_LABELS[s.weather.kind];

  return (
    <div className="space-y-4">
      <Panel title={`Rennwochenende · ${track.name}`}>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Strecke" value={track.name} hint={`${TRACK_KIND_LABELS[track.kind]} · ${track.laps} Runden`} />
          <Stat label="Wetter" value={`${weather.icon} ${weather.label}`} hint={`${s.weather.temperature}°C · ${weather.desc}`} />
          <Stat label="Fahrzeugleistung" value={Math.round(carPerformance(s))} hint={`Zuverlässigkeit ${Math.round(carReliability(s))}%`} />
          <Stat label="Setup" value={`${Math.round(s.team.development.setup)}%`} hint={money(s.team.money)} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Chip>Länge {track.lengthKm} km</Chip>
          <Chip>{track.cornerCount} Kurven</Chip>
          <Chip>Verschleiß {track.tyreWear}/10</Chip>
          <Chip>Überholen {track.overtaking}/10</Chip>
          <Chip tone="accent">Prognose: {s.weather.forecast.map((f) => WEATHER_LABELS[f].icon).join(" ")}</Chip>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Aufstellung">
          {lineup.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Kein Fahrer nominiert – wähle im Fahrerbereich die Startaufstellung.
            </p>
          )}
          <div className="space-y-2">
            {lineup.map((id, i) => {
              const d = s.drivers[id]!;
              return (
                <div key={id} className="rounded-lg bg-secondary/50 p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-display font-bold">Auto {i + 1}: {d.name}</span>
                    <Chip tone="accent">Rating {driverRating(d)}</Chip>
                  </div>
                  <Bar value={driverRating(d)} />
                </div>
              );
            })}
          </div>
          <Button className="mt-3" variant="ghost" onClick={() => setScreen("drivers")}>Aufstellung ändern</Button>
        </Panel>

        <Panel title="Strategie">
          <div className="space-y-2">
            {STRATEGIES.map((st) => (
              <button
                key={st.id}
                onClick={() => setStrategy(st.id)}
                className={`w-full rounded-lg border px-3 py-2 text-left ${strategy === st.id ? "border-primary bg-primary/10" : "border-border bg-secondary/40"}`}
              >
                <div className="font-display font-bold uppercase">{st.label}</div>
                <div className="text-xs text-muted-foreground">{st.desc}</div>
              </button>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Sessions">
        <div className="flex flex-wrap gap-2">
          <Button variant="accent" disabled={s.season.trainingDone} onClick={() => actions.runTraining(false)}>
            Training fahren
          </Button>
          <Button variant="ghost" disabled={s.season.trainingDone} onClick={() => actions.runTraining(true)}>
            Training überspringen
          </Button>
          <Button
            disabled={s.season.qualiDone || lineup.length === 0}
            onClick={() => actions.runQualifying(strategy)}
          >
            Qualifying simulieren
          </Button>
          <Button variant="primary" disabled={lineup.length === 0} onClick={runRace}>
            Rennen simulieren
          </Button>
          {log.length > 0 && visibleLog < log.length && (
            <Button variant="ghost" onClick={() => setVisibleLog(log.length)}>Animationen überspringen</Button>
          )}
        </div>
      </Panel>

      {s.season.qualiDone && s.season.lastQualifying && !record && (
        <Panel title="Qualifying-Ergebnis">
          <ol className="grid gap-1 text-sm sm:grid-cols-2">
            {s.season.lastQualifying.slice(0, 20).map((q) => {
              const d = s.drivers[q.driverId];
              const own = s.team.lineup.includes(q.driverId);
              return (
                <li key={q.driverId} className={`flex justify-between rounded px-2 py-1 ${own ? "bg-primary/15" : ""}`}>
                  <span>P{q.position} {d?.name ?? "?"}</span>
                  <span className="text-xs text-muted-foreground">
                    {own ? s.team.name : (s.aiTeams.find((t) => t.id === d?.teamId)?.name ?? "")}
                  </span>
                </li>
              );
            })}
          </ol>
        </Panel>
      )}

      {log.length > 0 && (
        <Panel title="Rennverlauf">
          <ul className="space-y-1 text-sm">
            {log.slice(0, visibleLog).map((l, i) => (
              <li key={i} className="animate-in fade-in slide-in-from-left-2">• {l}</li>
            ))}
          </ul>
        </Panel>
      )}

      {record && visibleLog >= log.length && (
        <Panel title={`Ergebnis · ${record.trackName}`}>
          <table className="w-full text-sm">
            <thead>
              <tr className="label-xs text-left"><th className="py-1">Pos</th><th>Fahrer</th><th>Team</th><th>Start</th><th>Vorfälle</th><th className="text-right">Punkte</th></tr>
            </thead>
            <tbody>
              {record.results.slice(0, 20).map((r) => (
                <tr key={r.driverId} className={`border-t border-border/60 ${r.teamId === "player" ? "text-accent" : ""}`}>
                  <td className="py-1">{r.dnf ? "DNF" : r.position}</td>
                  <td>{r.driverName} {r.fastestLap ? "⚡" : ""}</td>
                  <td className="text-xs text-muted-foreground">{r.teamName}</td>
                  <td>P{r.grid}{r.position && !r.dnf ? ` (${r.grid - r.position >= 0 ? "+" : ""}${r.grid - r.position})` : ""}</td>
                  <td className="text-xs text-muted-foreground">
                    {(r.incidents ?? []).join(", ")}
                    {r.penaltySeconds ? ` +${r.penaltySeconds}s` : ""}
                  </td>
                  <td className="text-right font-bold">{r.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="ghost" onClick={() => setScreen("season")}>Meisterschaftsstand</Button>
            {s.media.pending.length > 0 && (
              <Button variant="accent" onClick={() => setScreen("media")}>
                Medientermine ({s.media.pending.length})
              </Button>
            )}
            <Button variant="ghost" onClick={() => setScreen("finance")}>Finanzbericht</Button>
            <Button
              onClick={() => {
                setRecord(null);
                setLog([]);
                setVisibleLog(0);
              }}
            >
              Nächstes Rennwochenende
            </Button>
          </div>
        </Panel>
      )}
    </div>
  );
}
