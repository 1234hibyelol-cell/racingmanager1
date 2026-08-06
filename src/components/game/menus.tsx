// Hauptmenü, Karriere-Erstellung, Laden, Einstellungen.
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { DIFFICULTY, COUNTRIES, PREMIUM_ITEMS, TEAM_STYLES } from "@/game/data";
import { money } from "@/game/engine";
import { AUTO_SLOT, SLOT_COUNT } from "@/game/save";
import { DEFAULT_SETTINGS, useGame } from "@/game/store";
import { useEntitlements } from "@/hooks/use-entitlements";
import type { Difficulty, Team } from "@/game/types";
import { Button, Chip, Field, Panel, Stat, inputClass } from "./ui";

const LOGOS = ["🏁", "⚡", "🦅", "🛞", "🔥", "🐺", "★", "🛡️"];
const COLORS = ["#e0332f", "#f0a020", "#2f7de0", "#20c997", "#8e5cf7", "#ff6b35"];

export function MainMenu() {
  const { setScreen, state, saves } = useGame();
  const items: { label: string; screen: Parameters<typeof setScreen>[0]; hint: string }[] = [
    { label: "Neues Spiel", screen: "newgame", hint: "Team gründen & Karriere starten" },
    { label: "Spiel laden", screen: "load", hint: `${saves.length} Spielstände` },
    { label: "Karriere", screen: state ? "dashboard" : "load", hint: state ? "Weiterspielen" : "Spielstand nötig" },
    { label: "Shop", screen: "shop", hint: "Premium-Pakete & Boosts" },
    { label: "Einstellungen", screen: "settings", hint: "Animationen, Autosave" },
    { label: "Entwickler-Menü", screen: "admin", hint: "Passwortgeschützt" },
  ];
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-4 py-10">
      <div className="mb-8">
        <Chip tone="primary">Racing Manager · Bauphase 1</Chip>
        <h1 className="mt-3 font-display text-5xl font-black uppercase leading-none sm:text-7xl">
          Legends<span className="text-primary"> Grid</span>
        </h1>
        <p className="mt-2 max-w-lg text-sm text-muted-foreground">
          Gründe deinen Rennstall, entwickle das Auto, forsche, verpflichte Fahrer und gewinne die Meisterschaft.
        </p>
      </div>

      <div className="panel stripe-top mb-4 p-4 pt-5">
        <div className="label-xs">Multiplayer</div>
        <div className="font-display text-lg font-bold uppercase tracking-wide">Live-Liga</div>
        <p className="mt-1 text-xs text-muted-foreground">
          Eigene Liga erstellen oder einer bestehenden Liga mit 20 Teams beitreten – stündliche Rennen, live simuliert.
        </p>
        <Link to="/online" className="mt-3 inline-block">
          <Button variant="accent">Multiplayer öffnen</Button>
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((it) => (
          <button
            key={it.label}
            onClick={() => setScreen(it.screen)}
            className="panel stripe-top group px-4 py-5 text-left transition hover:glow"
          >
            <div className="font-display text-lg font-bold uppercase tracking-wide">{it.label}</div>
            <div className="text-xs text-muted-foreground">{it.hint}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

export function ShopScreen() {
  const { state, setScreen } = useGame();
  const ent = useEntitlements();
  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 px-4 py-8">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-3xl font-black uppercase">Shop</h2>
        <Button variant="ghost" onClick={() => setScreen(state ? "dashboard" : "menu")}>Zurück</Button>
      </div>

      {!ent.signedIn ? (
        <Panel title="Konto nötig">
          <p className="text-sm text-muted-foreground">
            Premium-Inhalte gehören zu deinem Konto und gelten für alle Karrieren. Melde dich an, um den Shop zu nutzen.
          </p>
          <Link to="/auth" className="mt-3 inline-block">
            <Button variant="primary">Anmelden</Button>
          </Link>
        </Panel>
      ) : ent.loading || !ent.data ? (
        <Panel title="Shop">
          <p className="text-sm text-muted-foreground">Lade Kontodaten …</p>
        </Panel>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Credits" value={ent.data.credits} />
            <Stat label="Speicherplätze" value={ent.data.saveSlots} />
            <Stat label="Theme" value={ent.data.theme} />
            <Stat label="Erweiterte Statistiken" value={ent.data.advancedStats ? "aktiv" : "inaktiv"} />
          </div>
          <Panel title="Credits">
            <p className="mb-2 text-xs text-muted-foreground">
              Alle Käufe sind kontobasiert – sie bleiben auch nach einem Karriere-Neustart erhalten.
            </p>
            <Button
              variant="accent"
              disabled={ent.bonus.isPending}
              onClick={() => ent.bonus.mutate(undefined, { onError: (e) => toast.error(errText(e)) })}
            >
              Tagesbonus abholen (+120 CR)
            </Button>
          </Panel>
          <Panel title="Kosmetik & Komfort">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {PREMIUM_ITEMS.map((item) => {
                const owned = ent.data!.owned.includes(item.id);
                return (
                  <div key={item.id} className="rounded-lg border border-border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-display font-bold">{item.name}</span>
                      <Chip tone={owned ? "primary" : "accent"}>{owned ? "Besitz" : `${item.price} CR`}</Chip>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{item.desc}</p>
                    <Button
                      className="mt-2"
                      disabled={owned || ent.data!.credits < item.price || ent.buy.isPending}
                      onClick={() => ent.buy.mutate(item.id, { onError: (e) => toast.error(errText(e)) })}
                    >
                      {owned ? "Freigeschaltet" : "Freischalten"}
                    </Button>
                  </div>
                );
              })}
            </div>
          </Panel>
        </>
      )}
    </div>
  );
}

function errText(e: unknown) {
  return e instanceof Error ? e.message : "Aktion fehlgeschlagen";
}


export function NewGameScreen() {
  const { newGame, setScreen } = useGame();
  const [teamName, setTeamName] = useState("Apex Legends Racing");
  const [logo, setLogo] = useState(LOGOS[0]!);
  const [color, setColor] = useState(COLORS[0]!);
  const [country, setCountry] = useState(COUNTRIES[0]!);
  const [style, setStyle] = useState<Team["style"]>("balanced");
  const [difficulty, setDifficulty] = useState<Difficulty>("normal");

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4 px-4 py-8">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-3xl font-black uppercase">Team gründen</h2>
        <Button variant="ghost" onClick={() => setScreen("menu")}>Zurück</Button>
      </div>

      <Panel title="Identität">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Teamname">
            <input className={inputClass} value={teamName} onChange={(e) => setTeamName(e.target.value)} />
          </Field>
          <Field label="Heimatland">
            <select className={inputClass} value={country} onChange={(e) => setCountry(e.target.value)}>
              {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Teamlogo">
            <div className="flex flex-wrap gap-2">
              {LOGOS.map((l) => (
                <button
                  key={l}
                  onClick={() => setLogo(l)}
                  className={`size-10 rounded-md border text-lg ${logo === l ? "border-primary bg-primary/15" : "border-border bg-secondary"}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Teamfarbe">
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  aria-label={`Farbe ${c}`}
                  className={`size-10 rounded-md border-2 ${color === c ? "border-foreground" : "border-transparent"}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </Field>
        </div>
      </Panel>

      <Panel title="Teamstil">
        <div className="grid gap-2 sm:grid-cols-2">
          {TEAM_STYLES.map((s) => (
            <button
              key={s.id}
              onClick={() => setStyle(s.id)}
              className={`rounded-lg border px-3 py-3 text-left ${style === s.id ? "border-primary bg-primary/10" : "border-border bg-secondary/50"}`}
            >
              <div className="font-display font-bold uppercase">{s.label}</div>
              <div className="text-xs text-muted-foreground">{s.desc}</div>
            </button>
          ))}
        </div>
      </Panel>

      <Panel title="Schwierigkeit">
        <div className="grid gap-2 sm:grid-cols-4">
          {(Object.keys(DIFFICULTY) as Difficulty[]).map((d) => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              className={`rounded-lg border px-3 py-3 text-left ${difficulty === d ? "border-primary bg-primary/10" : "border-border bg-secondary/50"}`}
            >
              <div className="font-display font-bold uppercase">{DIFFICULTY[d].label}</div>
              <div className="text-xs text-muted-foreground">Budget {money(DIFFICULTY[d].budget)}</div>
              <div className="text-xs text-muted-foreground">
                Gegner ×{DIFFICULTY[d].aiStrength} · Kosten ×{DIFFICULTY[d].costFactor}
              </div>
            </button>
          ))}
        </div>
      </Panel>

      <Button
        className="w-full py-3"
        onClick={() => newGame({ teamName: teamName.trim() || "Neues Team", logo, color, country, style, difficulty })}
      >
        Karriere starten
      </Button>
    </div>
  );
}

export function LoadScreen() {
  const { saves, load, removeSave, save, state, setScreen } = useGame();
  const slots = Array.from({ length: SLOT_COUNT + 1 }, (_, i) => i);
  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 px-4 py-8">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-3xl font-black uppercase">Spielstände</h2>
        <Button variant="ghost" onClick={() => setScreen(state ? "dashboard" : "menu")}>Zurück</Button>
      </div>
      {slots.map((slot) => {
        const meta = saves.find((s) => s.slot === slot);
        return (
          <div key={slot} className="panel flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <div className="label-xs">{slot === AUTO_SLOT ? "Autosave" : `Slot ${slot}`}</div>
              {meta ? (
                <div>
                  <div className="font-display text-lg font-bold">{meta.teamName}</div>
                  <div className="text-xs text-muted-foreground">
                    Saison {meta.year} · Rennen {meta.round + 1} · {money(meta.money)} ·{" "}
                    {new Date(meta.updatedAt).toLocaleString("de-DE")}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Leer</div>
              )}
            </div>
            <div className="flex gap-2">
              {meta && <Button onClick={() => load(slot)}>Laden</Button>}
              {state && slot !== AUTO_SLOT && (
                <Button variant="ghost" onClick={() => save(slot)}>Speichern</Button>
              )}
              {meta && <Button variant="danger" onClick={() => removeSave(slot)}>Löschen</Button>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function SettingsScreen() {
  const { settings, setSettings, setScreen, state, saves, removeSave } = useGame();
  const ent = useEntitlements();
  const toggles: [keyof typeof settings, string, string][] = [
    ["skipAnimations", "Animationen überspringen", "Rennlog erscheint sofort"],
    ["autoSave", "Automatisches Speichern", "Speichert nach jeder Aktion in Slot 0"],
    ["toasts", "Hinweis-Meldungen", "Kurze Bestätigungen am Bildschirmrand"],
    ["compactUi", "Kompakte Oberfläche", "Weniger Abstände, mehr Inhalt"],
    ["highContrast", "Hoher Kontrast", "Stärkere Ränder und Textfarben"],
    ["confirmSpending", "Ausgaben bestätigen", "Rückfrage bei teuren Käufen"],
    ["showHints", "Tipps anzeigen", "Erklärtexte in den Menüs"],
  ];

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4 px-4 py-8">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-3xl font-black uppercase">Einstellungen</h2>
        <Button variant="ghost" onClick={() => setScreen(state ? "dashboard" : "menu")}>Zurück</Button>
      </div>

      <Panel title="Spiel & Oberfläche">
        <div className="space-y-3">
          {toggles.map(([key, label, hint]) => (
            <label key={key} className="flex items-center justify-between gap-3 rounded-lg bg-secondary/50 px-3 py-3">
              <span>
                <span className="block text-sm">{label}</span>
                <span className="block text-xs text-muted-foreground">{hint}</span>
              </span>
              <input
                type="checkbox"
                className="size-5 accent-[var(--primary)]"
                checked={settings[key] as boolean}
                onChange={(e) => setSettings({ ...settings, [key]: e.target.checked })}
              />
            </label>
          ))}
        </div>
      </Panel>

      <Panel title="Renngeschwindigkeit">
        <div className="flex gap-2">
          {([
            ["slow", "Langsam"],
            ["normal", "Normal"],
            ["fast", "Schnell"],
          ] as const).map(([value, label]) => (
            <Button
              key={value}
              variant={settings.raceSpeed === value ? "primary" : "ghost"}
              onClick={() => setSettings({ ...settings, raceSpeed: value })}
            >
              {label}
            </Button>
          ))}
        </div>
      </Panel>

      <Panel title="Konto">
        {ent.signedIn ? (
          <p className="text-sm text-muted-foreground">
            Angemeldet · {ent.data?.credits ?? 0} Credits · {ent.data?.owned.length ?? 0} Premium-Inhalte ·{" "}
            {ent.data?.saveSlots ?? SLOT_COUNT} Speicherplätze
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Nicht angemeldet – Premium und Online-Ligen benötigen ein Konto.</p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <Link to="/auth"><Button variant="ghost">{ent.signedIn ? "Konto wechseln" : "Anmelden"}</Button></Link>
          <Link to="/online"><Button variant="ghost">Multiplayer</Button></Link>
          <Button variant="ghost" onClick={() => setScreen("shop")}>Shop</Button>
        </div>
      </Panel>

      <Panel title="Daten">
        <p className="text-xs text-muted-foreground">
          {saves.length} lokale Spielstände. Autosave liegt in Slot {AUTO_SLOT}.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            variant="ghost"
            disabled={!saves.some((s) => s.slot === AUTO_SLOT)}
            onClick={() => removeSave(AUTO_SLOT)}
          >
            Autosave löschen
          </Button>
          <Button variant="ghost" onClick={() => setSettings({ ...DEFAULT_SETTINGS })}>
            Einstellungen zurücksetzen
          </Button>
        </div>
      </Panel>
    </div>
  );
}
