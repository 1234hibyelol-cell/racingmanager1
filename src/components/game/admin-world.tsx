// Admin-Erweiterung Bauphase 2: Welt, Wetter, Strecken, Teams, Events, Personal, Belohnungen.
import { useState } from "react";
import { STAFF_LABELS, TRACK_KIND_LABELS, WEATHER_LABELS } from "@/game/data";
import { useGame } from "@/game/store";
import type { StaffRole, TrackKind, WeatherKind } from "@/game/types";
import { Button, Field, Panel, inputClass } from "./ui";

const WEATHERS = Object.keys(WEATHER_LABELS) as WeatherKind[];
const KINDS = Object.keys(TRACK_KIND_LABELS) as TrackKind[];
const ROLES = Object.keys(STAFF_LABELS) as StaffRole[];
const EVENT_KINDS = ["winter", "summer", "special", "historic", "community"] as const;

export function AdminWorldPanels() {
  const { state, actions } = useGame();
  const [track, setTrack] = useState({ name: "Neue Strecke", country: "Deutschland", kind: "technical" as TrackKind, laps: 60 });
  const [team, setTeam] = useState({ name: "Neues Team", color: "#e0332f", strength: 80 });
  const [driverId, setDriverId] = useState("");
  const [trait, setTrait] = useState("motivation");
  const [traitValue, setTraitValue] = useState(90);
  if (!state) return null;
  const s = state;
  const roster = [...s.team.driverIds, ...s.freeAgents.slice(0, 30)];

  return (
    <>
      <Panel title="Wetter steuern">
        <div className="mb-2 text-sm text-muted-foreground">
          Aktuell: {WEATHER_LABELS[s.weather.kind].icon} {WEATHER_LABELS[s.weather.kind].label} · {s.weather.temperature}°C
          {s.weather.locked ? " · fixiert" : ""}
        </div>
        <div className="flex flex-wrap gap-2">
          {WEATHERS.map((w) => (
            <Button key={w} variant="ghost" onClick={() => actions.admin.setWeather(w)}>
              {WEATHER_LABELS[w].icon} {WEATHER_LABELS[w].label}
            </Button>
          ))}
          <Button variant="accent" onClick={() => actions.admin.unlockWeather()}>Freigeben</Button>
        </div>
      </Panel>

      <Panel title="Welt-Simulation">
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => actions.admin.worldTick()}>Welt-Tick ausführen</Button>
          <Button variant="accent" onClick={() => actions.admin.ageSeason()}>Ein Jahr simulieren</Button>
          <Button variant="ghost" onClick={() => actions.admin.rerollSponsors()}>Sponsoren neu würfeln</Button>
          <Button variant="danger" onClick={() => actions.admin.resetSeason()}>Saison zurücksetzen</Button>
          <Button variant="ghost" onClick={() => actions.admin.newCar()}>Neues Fahrzeug</Button>
        </div>
      </Panel>

      <Panel title="Strecke erstellen">
        <div className="grid gap-2 sm:grid-cols-2">
          <Field label="Name">
            <input className={inputClass} value={track.name} onChange={(e) => setTrack({ ...track, name: e.target.value })} />
          </Field>
          <Field label="Land">
            <input className={inputClass} value={track.country} onChange={(e) => setTrack({ ...track, country: e.target.value })} />
          </Field>
          <Field label="Typ">
            <select className={inputClass} value={track.kind} onChange={(e) => setTrack({ ...track, kind: e.target.value as TrackKind })}>
              {KINDS.map((k) => <option key={k} value={k}>{TRACK_KIND_LABELS[k]}</option>)}
            </select>
          </Field>
          <Field label="Runden">
            <input className={inputClass} type="number" value={track.laps} onChange={(e) => setTrack({ ...track, laps: Number(e.target.value) })} />
          </Field>
        </div>
        <Button
          className="mt-3"
          onClick={() =>
            actions.admin.createTrack({
              name: track.name,
              country: track.country,
              kind: track.kind,
              lengthKm: 5,
              cornerCount: 15,
              tyreWear: 6,
              overtaking: 6,
              rainChance: 0.25,
              power: 0.35,
              corners: 0.4,
              brakes: 0.25,
              laps: Math.max(5, track.laps),
            })
          }
        >
          Strecke anlegen &amp; in Kalender aufnehmen
        </Button>
      </Panel>

      <Panel title="Teams verwalten">
        <div className="grid gap-2 sm:grid-cols-3">
          <Field label="Name">
            <input className={inputClass} value={team.name} onChange={(e) => setTeam({ ...team, name: e.target.value })} />
          </Field>
          <Field label="Farbe">
            <input className={inputClass} type="color" value={team.color} onChange={(e) => setTeam({ ...team, color: e.target.value })} />
          </Field>
          <Field label={`Stärke ${team.strength}`}>
            <input type="range" min={30} max={99} value={team.strength} onChange={(e) => setTeam({ ...team, strength: Number(e.target.value) })} className="w-full accent-[var(--primary)]" />
          </Field>
        </div>
        <Button className="mt-3" onClick={() => actions.admin.createTeam(team.name, team.color, team.strength)}>Team erstellen</Button>
        <div className="mt-3 space-y-2">
          {s.aiTeams.map((t) => (
            <div key={t.id} className="flex flex-wrap items-center gap-2 text-sm">
              <input className={`${inputClass} max-w-40`} value={t.name} onChange={(e) => actions.admin.editTeam(t.id, "name", e.target.value)} />
              <input className="size-9 rounded" type="color" value={t.color} onChange={(e) => actions.admin.editTeam(t.id, "color", e.target.value)} aria-label={`Farbe ${t.name}`} />
              <input
                type="range" min={30} max={99} value={Math.round(t.strength)}
                onChange={(e) => actions.admin.editTeam(t.id, "strength", Number(e.target.value))}
                className="flex-1 accent-[var(--primary)]"
              />
              <span className="w-8 text-right text-muted-foreground">{Math.round(t.strength)}</span>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Fahrer-Persönlichkeit">
        <div className="grid gap-2 sm:grid-cols-3">
          <Field label="Fahrer">
            <select className={inputClass} value={driverId} onChange={(e) => setDriverId(e.target.value)}>
              <option value="">– wählen –</option>
              {roster.map((id) => <option key={id} value={id}>{s.drivers[id]?.name}</option>)}
            </select>
          </Field>
          <Field label="Eigenschaft">
            <select className={inputClass} value={trait} onChange={(e) => setTrait(e.target.value)}>
              {["motivation", "confidence", "pressure", "popularity", "loyalty", "aggression", "mediaSkill"].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label="Wert">
            <input className={inputClass} type="number" value={traitValue} onChange={(e) => setTraitValue(Number(e.target.value))} />
          </Field>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button disabled={!driverId} onClick={() => actions.admin.setTrait(driverId, trait, traitValue)}>Setzen</Button>
          <Button variant="ghost" disabled={!driverId} onClick={() => actions.admin.editDriver(driverId, "age", 22)}>Alter 22</Button>
          <Button variant="ghost" disabled={!driverId} onClick={() => actions.admin.editDriver(driverId, "salary", 500_000)}>Gehalt 500k</Button>
        </div>
      </Panel>

      <Panel title="Personal & Events">
        <div className="flex flex-wrap gap-2">
          {ROLES.map((r) => (
            <Button key={r} variant="ghost" onClick={() => actions.admin.createStaff(r)}>
              Top-{STAFF_LABELS[r].label}
            </Button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {EVENT_KINDS.map((k) => (
            <Button key={k} variant="accent" onClick={() => actions.admin.startEvent(k)}>Event: {k}</Button>
          ))}
        </div>
      </Panel>

      <Panel title="Belohnungen">
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => actions.admin.grantReward(5_000_000, 500, 5)}>Paket klein</Button>
          <Button variant="accent" onClick={() => actions.admin.grantReward(25_000_000, 2000, 15)}>Paket groß</Button>
          <Button variant="ghost" onClick={() => actions.addCredits(1000)}>+1000 Credits</Button>
        </div>
      </Panel>
    </>
  );
}
