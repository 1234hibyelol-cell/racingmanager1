// Entwickler-Menü (versteckt, Passwort: Admin) – strikt getrennt vom Spielerbereich.
import { useState } from "react";
import { BUILDING_LABELS, PART_LABELS, RESEARCH_LABELS } from "@/game/data";
import { money } from "@/game/engine";
import { useGame } from "@/game/store";
import type { BuildingKey, PartKey, ResearchKey } from "@/game/types";
import { Button, Chip, Field, Panel, inputClass } from "./ui";
import { AdminWorldPanels } from "./admin-world";

export function AdminScreen() {
  const { adminUnlocked, setAdminUnlocked, state, actions, setScreen, notify } = useGame();
  const [pw, setPw] = useState("");
  const [driverId, setDriverId] = useState("");
  const [skill, setSkill] = useState("speed");
  const [value, setValue] = useState(90);

  if (!adminUnlocked) {
    return (
      <div className="mx-auto w-full max-w-md space-y-4 px-4 py-16">
        <h2 className="font-display text-3xl font-black uppercase">Entwickler-Zugang</h2>
        <Panel>
          <Field label="Passwort">
            <input
              className={inputClass}
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (pw === "Admin" ? setAdminUnlocked(true) : notify("Falsches Passwort."))}
            />
          </Field>
          <div className="mt-3 flex gap-2">
            <Button onClick={() => (pw === "Admin" ? setAdminUnlocked(true) : notify("Falsches Passwort."))}>
              Entsperren
            </Button>
            <Button variant="ghost" onClick={() => setScreen(state ? "dashboard" : "menu")}>Zurück</Button>
          </div>
        </Panel>
      </div>
    );
  }

  if (!state) {
    return (
      <div className="mx-auto w-full max-w-md space-y-3 px-4 py-16 text-center">
        <p className="text-sm text-muted-foreground">Kein aktiver Spielstand – starte oder lade zuerst eine Karriere.</p>
        <Button onClick={() => setScreen("menu")}>Zum Menü</Button>
      </div>
    );
  }

  const roster = [...state.team.driverIds, ...state.freeAgents.slice(0, 30)];

  return (
    <div className="mx-auto w-full max-w-5xl space-y-4 px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <Chip tone="accent">Admin-Bereich</Chip>
          <h2 className="font-display text-3xl font-black uppercase">Entwickler-Menü</h2>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setAdminUnlocked(false)}>Sperren</Button>
          <Button variant="ghost" onClick={() => setScreen("dashboard")}>Zum Spiel</Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Wirtschaft">
          <div className="mb-2 text-sm text-muted-foreground">Kasse: {money(state.team.money)}</div>
          <div className="flex flex-wrap gap-2">
            {[1_000_000, 10_000_000, 100_000_000].map((v) => (
              <Button key={v} onClick={() => actions.admin.addMoney(v)}>+{money(v)}</Button>
            ))}
            <Button variant="danger" onClick={() => actions.admin.addMoney(-state.team.money)}>Kasse leeren</Button>
          </div>
        </Panel>

        <Panel title="Balancing">
          <div className="space-y-3">
            <Field label={`Gegnerstärke ×${state.aiStrengthModifier.toFixed(2)}`}>
              <input
                type="range" min="0.6" max="1.4" step="0.02"
                value={state.aiStrengthModifier}
                onChange={(e) => actions.admin.setAiStrength(Number(e.target.value))}
                className="w-full accent-[var(--primary)]"
              />
            </Field>
            <Field label={`Teamruf ${state.team.reputation}`}>
              <input
                type="range" min="0" max="100"
                value={state.team.reputation}
                onChange={(e) => actions.admin.setReputation(Number(e.target.value))}
                className="w-full accent-[var(--primary)]"
              />
            </Field>
            <Field label={`Saison-Rennen ${state.season.round + 1}/${state.season.calendar.length}`}>
              <input
                type="range" min="0" max={state.season.calendar.length - 1}
                value={state.season.round}
                onChange={(e) => actions.admin.setRound(Number(e.target.value))}
                className="w-full accent-[var(--primary)]"
              />
            </Field>
          </div>
        </Panel>

        <Panel title="Fahrer bearbeiten">
          <div className="grid gap-2 sm:grid-cols-3">
            <Field label="Fahrer">
              <select className={inputClass} value={driverId} onChange={(e) => setDriverId(e.target.value)}>
                <option value="">– wählen –</option>
                {roster.map((id) => (
                  <option key={id} value={id}>{state.drivers[id]?.name}</option>
                ))}
              </select>
            </Field>
            <Field label="Fähigkeit">
              <select className={inputClass} value={skill} onChange={(e) => setSkill(e.target.value)}>
                {Object.keys(state.drivers[roster[0]!]!.skills).map((k) => (
                  <option key={k} value={k}>{k}</option>
                ))}
              </select>
            </Field>
            <Field label="Wert">
              <input className={inputClass} type="number" value={value} onChange={(e) => setValue(Number(e.target.value))} />
            </Field>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button disabled={!driverId} onClick={() => actions.admin.setSkill(driverId, skill, value)}>Wert setzen</Button>
            <Button variant="accent" onClick={() => actions.admin.createDriver()}>Fahrer erstellen</Button>
            <Button variant="danger" disabled={!driverId} onClick={() => { actions.admin.deleteDriver(driverId); setDriverId(""); }}>
              Fahrer löschen
            </Button>
          </div>
        </Panel>

        <Panel title="Fahrzeugwerte">
          <div className="space-y-2">
            {(Object.keys(PART_LABELS) as PartKey[]).map((p) => (
              <div key={p} className="flex items-center gap-2 text-sm">
                <span className="w-28">{PART_LABELS[p]}</span>
                <input
                  className={inputClass} type="number" value={state.team.car.parts[p].performance}
                  onChange={(e) => actions.admin.setPart(p, "performance", Number(e.target.value))}
                />
                <input
                  className={inputClass} type="number" value={state.team.car.parts[p].reliability}
                  onChange={(e) => actions.admin.setPart(p, "reliability", Number(e.target.value))}
                />
              </div>
            ))}
            <p className="label-xs">Leistung / Zuverlässigkeit</p>
          </div>
        </Panel>

        <Panel title="Forschung abschließen">
          <div className="flex flex-wrap gap-2">
            {(Object.keys(RESEARCH_LABELS) as ResearchKey[]).map((k) => (
              <Button key={k} variant="ghost" onClick={() => actions.admin.completeResearch(k)}>
                {RESEARCH_LABELS[k].label} +1
              </Button>
            ))}
          </div>
        </Panel>

        <Panel title="Gebäude">
          <div className="mb-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
            {(Object.keys(BUILDING_LABELS) as BuildingKey[]).map((b) => (
              <span key={b}>{BUILDING_LABELS[b].label}: Lv {state.team.buildings[b].level}</span>
            ))}
          </div>
          <Button onClick={() => actions.admin.maxBuildings()}>Alle Gebäude +1</Button>
        </Panel>

        <AdminWorldPanels />
      </div>
    </div>
  );
}
