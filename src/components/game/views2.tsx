// Bauphase 2 – Spielerbereiche: Personal, Akademie, Entwicklung, Design, Meisterschaften,
// Medien, Wirtschaft, Events, Welt, Profil, Premium.
import { useState } from "react";
import {
  CHAMPIONSHIP_TEMPLATES,
  DESIGN_COLORS,
  GARAGE_STYLES,
  HELMET_PATTERNS,
  HQ_STYLES,
  LIVERY_PATTERNS,
  PART_LABELS,
  PREMIUM_ITEMS,
  SPONSOR_PLACEMENTS,
  STAFF_LABELS,
  TRACKS,
  TRACK_KIND_LABELS,
  UI_THEMES,
  WEATHER_LABELS,
} from "@/game/data";
import {
  DEV_LABELS,
  STAGE_LABELS,
  devCost,
  driverRating,
  money,
  staffCosts,
  staffPower,
  type DevAction,
} from "@/game/engine";
import { academyScoutQuality } from "@/game/world";
import { useGame } from "@/game/store";
import type { Championship, PartKey, StaffRole } from "@/game/types";
import { Avatar, Bar, Button, Chip, Field, Panel, Stat, inputClass } from "./ui";

const STAFF_ROLES: StaffRole[] = ["engineer", "mechanic", "strategist", "designer"];

/* ---------------- Personal ---------------- */
export function StaffScreen() {
  const { state, actions } = useGame();
  const [role, setRole] = useState<StaffRole | "all">("all");
  if (!state) return null;
  const s = state;
  const market = s.staffMarket
    .map((id) => s.staff[id]!)
    .filter(Boolean)
    .filter((st) => role === "all" || st.role === role)
    .sort((a, b) => b.skill - a.skill)
    .slice(0, 24);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {STAFF_ROLES.map((r) => (
          <Stat key={r} label={STAFF_LABELS[r].label} value={Math.round(staffPower(s, r))} hint="Abteilungsstärke" />
        ))}
      </div>

      <Panel title={`Belegschaft ${s.team.staffIds.length}/12`}>
        <p className="mb-3 text-xs text-muted-foreground">Personalkosten pro Rennen: {money(staffCosts(s))}</p>
        {s.team.staffIds.length === 0 && <p className="text-sm text-muted-foreground">Kein Personal angestellt.</p>}
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {s.team.staffIds.map((id) => {
            const st = s.staff[id];
            if (!st) return null;
            return (
              <div key={id} className="rounded-lg bg-secondary/50 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-display font-bold">{st.name}</span>
                  <Chip tone="primary">{STAFF_LABELS[st.role].label}</Chip>
                </div>
                <div className="text-xs text-muted-foreground">
                  {st.age} J. · {st.personality} · {money(st.salary)}/Saison
                </div>
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-xs"><span className="text-muted-foreground">Können</span><span>{Math.round(st.skill)}</span></div>
                  <Bar value={st.skill} />
                  <div className="flex justify-between text-xs"><span className="text-muted-foreground">Erfahrung</span><span>{Math.round(st.experience)}</span></div>
                  <Bar value={st.experience} tone="muted" />
                </div>
                <Button className="mt-2" variant="danger" onClick={() => actions.fireStaff(id)}>Entlassen</Button>
              </div>
            );
          })}
        </div>
      </Panel>

      <Panel
        title="Personalmarkt"
        action={
          <div className="flex gap-2">
            <select className={inputClass} value={role} onChange={(e) => setRole(e.target.value as StaffRole | "all")}>
              <option value="all">Alle Rollen</option>
              {STAFF_ROLES.map((r) => <option key={r} value={r}>{STAFF_LABELS[r].label}</option>)}
            </select>
            <Button variant="ghost" onClick={() => actions.recruitStaff(role === "all" ? "engineer" : role)}>
              Bewerbung anfordern
            </Button>
          </div>
        }
      >
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {market.map((st) => (
            <div key={st.id} className="rounded-lg border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate font-display font-bold">{st.name}</span>
                <Chip>{STAFF_LABELS[st.role].label}</Chip>
              </div>
              <div className="text-xs text-muted-foreground">
                {st.age} J. · {st.personality} · Können {Math.round(st.skill)}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">{STAFF_LABELS[st.role].effect}</div>
              <Button className="mt-2" onClick={() => actions.hireStaff(st.id)}>
                Anstellen ({money(Math.round(st.salary * 0.25))})
              </Button>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

/* ---------------- Akademie ---------------- */
export function AcademyScreen() {
  const { state, actions } = useGame();
  if (!state) return null;
  const s = state;

  const card = (id: string, mode: "prospect" | "academy") => {
    const d = s.drivers[id];
    if (!d) return null;
    return (
      <div key={id} className="panel p-3">
        <div className="flex items-center gap-2">
          <Avatar initials={d.portrait} color={mode === "academy" ? s.team.color : undefined} />
          <div className="min-w-0 flex-1">
            <div className="truncate font-display font-bold">{d.name}</div>
            <div className="text-xs text-muted-foreground">
              {d.age} J. · {d.nationality} · {STAGE_LABELS[d.stage]}
            </div>
          </div>
          <Chip tone="accent">{driverRating(d)}</Chip>
        </div>
        <div className="mt-2 space-y-1">
          <div className="flex justify-between text-xs"><span className="text-muted-foreground">Talent</span><span>{Math.round(d.skills.talent)}</span></div>
          <Bar value={d.skills.talent} />
          <div className="flex justify-between text-xs"><span className="text-muted-foreground">Erfahrung</span><span>{Math.round(d.skills.experience)}</span></div>
          <Bar value={d.skills.experience} tone="muted" />
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {mode === "prospect" ? (
            <Button onClick={() => actions.signYouth(id)}>In die Akademie</Button>
          ) : (
            <>
              <Button variant="accent" onClick={() => actions.trainYouth(id)}>Training ({money(60_000)})</Button>
              <Button onClick={() => actions.promoteYouth(id)}>Befördern</Button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Scouting-Qualität" value={Math.round(academyScoutQuality(s))} hint="Kartschule + Talentzentrum" />
        <Stat label="Akademiefahrer" value={s.team.academyIds.length} />
        <Stat label="Beobachtete Talente" value={s.youthProspects.length} />
        <Stat label="Nachwuchs-Simulator" value={`Lv ${s.team.buildings.youthSimulator.level}`} />
      </div>

      <Panel title="Nachwuchsprogramm">
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => actions.scoutYouth()}>Talent scouten ({money(150_000)})</Button>
          <Button variant="accent" onClick={() => actions.runYouthRace()}>Nachwuchsrennen ({money(120_000)})</Button>
        </div>
      </Panel>

      <Panel title="Eigene Akademie">
        {s.team.academyIds.length === 0 && <p className="text-sm text-muted-foreground">Noch keine Fahrer aufgenommen.</p>}
        <div className="grid gap-3 lg:grid-cols-3">{s.team.academyIds.map((id) => card(id, "academy"))}</div>
      </Panel>

      <Panel title="Talent-Pool">
        <div className="grid gap-3 lg:grid-cols-3">{s.youthProspects.map((id) => card(id, "prospect"))}</div>
      </Panel>
    </div>
  );
}

/* ---------------- Entwicklung ---------------- */
export function DevelopmentScreen() {
  const { state, actions } = useGame();
  const [part, setPart] = useState<PartKey>("aero");
  if (!state) return null;
  const s = state;
  const dev = s.team.development;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Windkanaldaten" value={`${Math.round(dev.windTunnelData)}%`} hint={`Windkanal Lv ${s.team.buildings.windTunnel.level}`} />
        <Stat label="Simulationsdaten" value={`${Math.round(dev.simulationData)}%`} hint={`Labor Lv ${s.team.buildings.lab.level}`} />
        <Stat label="Setup" value={`${Math.round(dev.setup)}%`} hint={`${Math.round(dev.testKm)} Test-km`} />
        <Stat label="Entwicklungsfehler" value={dev.flaws.length} />
      </div>

      <Panel title="Entwicklungsprogramm">
        <Field label="Ziel-Bauteil für Prototypen">
          <select className={inputClass} value={part} onChange={(e) => setPart(e.target.value as PartKey)}>
            {(Object.keys(PART_LABELS) as PartKey[]).map((p) => (
              <option key={p} value={p}>{PART_LABELS[p]}</option>
            ))}
          </select>
        </Field>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {(Object.keys(DEV_LABELS) as DevAction[]).map((a) => (
            <div key={a} className="rounded-lg border border-border p-3">
              <div className="font-display font-bold uppercase">{DEV_LABELS[a].label}</div>
              <p className="mb-2 text-xs text-muted-foreground">{DEV_LABELS[a].desc}</p>
              <Button
                disabled={s.team.money < devCost(s, a)}
                onClick={() => actions.development(a, part)}
              >
                Starten ({money(devCost(s, a))})
              </Button>
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Prototypen">
          {dev.prototypes.length === 0 && <p className="text-sm text-muted-foreground">Keine Prototypen im Bau.</p>}
          <div className="space-y-2">
            {dev.prototypes.map((p) => (
              <div key={p.id} className="rounded-lg bg-secondary/50 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-display font-bold">{PART_LABELS[p.part]}</span>
                  <Chip tone={p.tested ? "primary" : "accent"}>{p.tested ? "Verbaut" : "Ungetestet"}</Chip>
                </div>
                <div className="mt-1 flex justify-between text-xs"><span className="text-muted-foreground">Qualität</span><span>{p.quality}</span></div>
                <Bar value={p.quality} />
              </div>
            ))}
          </div>
        </Panel>
        <Panel title="Bekannte Schwachstellen">
          {dev.flaws.length === 0 && <p className="text-sm text-muted-foreground">Keine Entwicklungsfehler bekannt.</p>}
          <ul className="space-y-2 text-sm">
            {dev.flaws.map((f) => (
              <li key={f.id} className="rounded-lg bg-destructive/15 px-3 py-2">
                {PART_LABELS[f.part]}: {f.label} (−{f.penalty} Zuverlässigkeit)
              </li>
            ))}
          </ul>
          <Button className="mt-3" variant="ghost" onClick={() => actions.development("reliabilityTest", part)}>
            Zuverlässigkeitstest ({money(devCost(s, "reliabilityTest"))})
          </Button>
        </Panel>
      </div>
    </div>
  );
}

/* ---------------- Design-Editor ---------------- */
export function DesignScreen() {
  const { state, actions } = useGame();
  if (!state) return null;
  const s = state;
  const d = s.team.design;
  const driverId = s.team.lineup.find(Boolean) ?? s.team.driverIds[0] ?? null;
  const driver = driverId ? s.drivers[driverId] : null;

  return (
    <div className="space-y-4">
      <Panel title="Fahrzeug-Vorschau">
        <div
          className="flex h-40 items-center justify-center rounded-xl border border-border"
          style={{ background: `linear-gradient(115deg, ${d.primary} 0%, ${d.primary} 55%, ${d.secondary} 55%, ${d.secondary} 100%)` }}
        >
          <div className="rounded-lg bg-background/70 px-4 py-2 text-center">
            <div className="font-display text-2xl font-black uppercase">{s.team.name}</div>
            <div className="text-xs text-muted-foreground">
              {d.logo} · #{d.raceNumber} · {d.pattern} · Sponsoren: {d.sponsorPlacement}
            </div>
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Lackierung">
          <div className="space-y-3">
            <Field label="Primärfarbe">
              <div className="flex flex-wrap gap-2">
                {DESIGN_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => actions.setDesign({ primary: c })}
                    className={`size-8 rounded-md border-2 ${d.primary === c ? "border-foreground" : "border-transparent"}`}
                    style={{ background: c }}
                    aria-label={`Primärfarbe ${c}`}
                  />
                ))}
              </div>
            </Field>
            <Field label="Sekundärfarbe">
              <div className="flex flex-wrap gap-2">
                {DESIGN_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => actions.setDesign({ secondary: c })}
                    className={`size-8 rounded-md border-2 ${d.secondary === c ? "border-foreground" : "border-transparent"}`}
                    style={{ background: c }}
                    aria-label={`Sekundärfarbe ${c}`}
                  />
                ))}
              </div>
            </Field>
            <Field label="Muster">
              <select className={inputClass} value={d.pattern} onChange={(e) => actions.setDesign({ pattern: e.target.value })}>
                {LIVERY_PATTERNS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="Sponsorenplatzierung">
              <select className={inputClass} value={d.sponsorPlacement} onChange={(e) => actions.setDesign({ sponsorPlacement: e.target.value })}>
                {SPONSOR_PLACEMENTS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
          </div>
        </Panel>

        <Panel title="Team-Identität">
          <div className="space-y-3">
            <Field label="Logo (Emoji)">
              <input className={inputClass} value={d.logo} maxLength={2} onChange={(e) => actions.setDesign({ logo: e.target.value })} />
            </Field>
            <Field label="Startnummer">
              <input
                className={inputClass}
                type="number"
                min={1}
                max={99}
                value={d.raceNumber}
                onChange={(e) => actions.setDesign({ raceNumber: Number(e.target.value) })}
              />
            </Field>
            <Field label="Garagenstil">
              <select className={inputClass} value={d.garage} onChange={(e) => actions.setDesign({ garage: e.target.value })}>
                {GARAGE_STYLES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </Field>
            <Field label="Hauptquartier">
              <select className={inputClass} value={d.headquarters} onChange={(e) => actions.setDesign({ headquarters: e.target.value })}>
                {HQ_STYLES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </Field>
            <Field label="Oberflächen-Theme">
              <select className={inputClass} value={d.uiTheme} onChange={(e) => actions.setDesign({ uiTheme: e.target.value })}>
                {UI_THEMES.map((g) => <option key={g} value={g}>{g}</option>)}
              </select>
            </Field>
          </div>
        </Panel>
      </div>

      {driver && (
        <Panel title={`Fahrerausrüstung · ${driver.name}`}>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Helmfarbe">
              <div className="flex flex-wrap gap-2">
                {DESIGN_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => actions.setDriverGear(driver.id, { helmet: c })}
                    className={`size-7 rounded-md border-2 ${driver.gear.helmet === c ? "border-foreground" : "border-transparent"}`}
                    style={{ background: c }}
                    aria-label={`Helmfarbe ${c}`}
                  />
                ))}
              </div>
            </Field>
            <Field label="Helmmuster">
              <select
                className={inputClass}
                value={driver.gear.helmetPattern}
                onChange={(e) => actions.setDriverGear(driver.id, { helmetPattern: e.target.value })}
              >
                {HELMET_PATTERNS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="Anzugfarbe">
              <div className="flex flex-wrap gap-2">
                {DESIGN_COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => actions.setDriverGear(driver.id, { suit: c })}
                    className={`size-7 rounded-md border-2 ${driver.gear.suit === c ? "border-foreground" : "border-transparent"}`}
                    style={{ background: c }}
                    aria-label={`Anzugfarbe ${c}`}
                  />
                ))}
              </div>
            </Field>
          </div>
        </Panel>
      )}
    </div>
  );
}

/* ---------------- Meisterschaften ---------------- */
export function ChampionshipsScreen() {
  const { state, actions } = useGame();
  const [tpl, setTpl] = useState(0);
  const [name, setName] = useState("Eigene Serie");
  const [raceCount, setRaceCount] = useState(10);
  const [teamCount, setTeamCount] = useState(10);
  if (!state) return null;
  const s = state;

  const create = () => {
    const t = CHAMPIONSHIP_TEMPLATES[tpl]!;
    const calendar = TRACKS.slice(0, Math.max(2, raceCount)).map((x) => x.id);
    const champ: Omit<Championship, "id" | "custom"> = {
      name,
      logo: "🏆",
      kind: t.kind,
      teamCount,
      driversPerTeam: t.kind === "endurance" ? 3 : 2,
      raceCount: calendar.length,
      calendar,
      points: [25, 18, 15, 12, 10, 8, 6, 4, 2, 1],
      budgetLimit: t.budgetLimit,
      carRules: t.carRules,
      rules: t.rules,
    };
    actions.createChampionship(champ);
  };

  return (
    <div className="space-y-4">
      <Panel title="Meisterschafts-Editor">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Vorlage">
            <select className={inputClass} value={tpl} onChange={(e) => setTpl(Number(e.target.value))}>
              {CHAMPIONSHIP_TEMPLATES.map((t, i) => <option key={t.name} value={i}>{t.name}</option>)}
            </select>
          </Field>
          <Field label="Name">
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label={`Rennen ${raceCount}`}>
            <input type="range" min={2} max={18} value={raceCount} onChange={(e) => setRaceCount(Number(e.target.value))} className="w-full accent-[var(--primary)]" />
          </Field>
          <Field label={`Teams ${teamCount}`}>
            <input type="range" min={4} max={16} value={teamCount} onChange={(e) => setTeamCount(Number(e.target.value))} className="w-full accent-[var(--primary)]" />
          </Field>
        </div>
        <Button className="mt-3" onClick={create}>Meisterschaft erstellen</Button>
      </Panel>

      <div className="grid gap-3 lg:grid-cols-2">
        {s.championships.map((c) => (
          <Panel key={c.id} title={`${c.logo} ${c.name}`}>
            <div className="mb-2 flex flex-wrap gap-2">
              <Chip tone={s.activeChampionshipId === c.id ? "primary" : "muted"}>
                {s.activeChampionshipId === c.id ? "Aktive Serie" : c.kind}
              </Chip>
              {c.custom && <Chip tone="accent">Eigen</Chip>}
            </div>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>{c.raceCount} Rennen · {c.teamCount} Teams · {c.driversPerTeam} Fahrer/Team</li>
              <li>Budgetdeckel: {money(c.budgetLimit)}</li>
              <li>Fahrzeugregeln: {c.carRules}</li>
              {c.rules.map((r) => <li key={r}>• {r}</li>)}
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button disabled={s.activeChampionshipId === c.id} onClick={() => actions.activateChampionship(c.id)}>
                Aktivieren
              </Button>
              {c.custom && (
                <Button variant="danger" onClick={() => actions.deleteChampionship(c.id)}>Löschen</Button>
              )}
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Medien ---------------- */
export function MediaScreen() {
  const { state, actions } = useGame();
  if (!state) return null;
  const s = state;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <Stat label="Fangemeinde" value={s.media.fanbase.toLocaleString("de-DE")} />
        <Stat label="Offene Termine" value={s.media.pending.length} />
        <Stat label="Teamruf" value={`${s.team.reputation}/100`} />
      </div>

      <Panel title="Medientermine">
        {s.media.pending.length === 0 && <p className="text-sm text-muted-foreground">Keine offenen Termine.</p>}
        <div className="space-y-3">
          {s.media.pending.map((ev) => (
            <div key={ev.id} className="rounded-lg border border-border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Chip tone="accent">{ev.kind === "press" ? "Pressekonferenz" : ev.kind === "interview" ? "Interview" : "Social Media"}</Chip>
                <span className="font-display font-bold">{ev.headline}</span>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{ev.question}</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-2">
                {ev.options.map((o) => (
                  <Button key={o.id} variant="ghost" onClick={() => actions.answerMedia(ev.id, o.id)}>
                    {o.label}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Fan-Feed">
        {s.media.feed.length === 0 && <p className="text-sm text-muted-foreground">Noch keine Reaktionen.</p>}
        <ul className="space-y-2 text-sm">
          {s.media.feed.map((p) => (
            <li key={p.id} className="rounded-lg bg-secondary/50 px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="font-display font-bold">{p.author}</span>
                <Chip tone={p.tone === "positive" ? "primary" : p.tone === "negative" ? "muted" : "accent"}>
                  {p.tone === "positive" ? "positiv" : p.tone === "negative" ? "kritisch" : "neutral"}
                </Chip>
              </div>
              <p className="text-muted-foreground">{p.text}</p>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

/* ---------------- Wirtschaft ---------------- */
export function FinanceScreen() {
  const { state, actions } = useGame();
  if (!state) return null;
  const s = state;
  const f = s.team.finance;
  const r = f.lastReport;

  const row = (label: string, field: "merchLevel" | "ticketLevel" | "marketing" | "factory", hint: string) => (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 py-2">
      <div>
        <div className="font-display font-bold">{label} · Stufe {f[field]}</div>
        <div className="text-xs text-muted-foreground">{hint}</div>
      </div>
      <div className="flex gap-2">
        <Button variant="ghost" onClick={() => actions.finance(field, -1)} disabled={f[field] <= 0}>−</Button>
        <Button onClick={() => actions.finance(field, 1)}>+ ({money(500_000)})</Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Kontostand" value={money(s.team.money)} />
        <Stat label="TV-Vertrag" value={money(f.tvDeal)} hint="pro Rennen" />
        <Stat label="Investoren" value={f.investors} />
        <Stat label="Reisekosten" value={money(f.travelCost)} />
      </div>

      <Panel title="Geschäftsbereiche">
        {row("Merchandise", "merchLevel", "Fanartikel-Verkäufe pro Rennen")}
        {row("Ticketing", "ticketLevel", "Einnahmen aus Heimrennen & Hospitality")}
        {row("Marketing", "marketing", "Mehr Sponsorenwert, höhere laufende Kosten")}
        {row("Fabrikausbau", "factory", "Effizientere Produktion, geringerer Verschleiß")}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="accent" onClick={() => actions.finance("investors", 1)}>
            Investor aufnehmen (+{money(2_000_000)})
          </Button>
        </div>
      </Panel>

      <Panel title={r ? `Finanzbericht Runde ${r.round + 1}` : "Finanzbericht"}>
        {!r && <p className="text-sm text-muted-foreground">Noch kein Rennen abgerechnet.</p>}
        {r && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <div className="label-xs mb-1">Einnahmen</div>
              <ul className="space-y-1 text-sm">
                <li className="flex justify-between"><span>Sponsoren</span><span>{money(r.sponsors)}</span></li>
                <li className="flex justify-between"><span>Preisgeld</span><span>{money(r.prize)}</span></li>
                <li className="flex justify-between"><span>TV-Gelder</span><span>{money(r.tv)}</span></li>
                <li className="flex justify-between"><span>Merchandise</span><span>{money(r.merch)}</span></li>
                <li className="flex justify-between"><span>Tickets</span><span>{money(r.tickets)}</span></li>
                <li className="flex justify-between"><span>Investoren</span><span>{money(r.investors)}</span></li>
              </ul>
            </div>
            <div>
              <div className="label-xs mb-1">Ausgaben</div>
              <ul className="space-y-1 text-sm">
                <li className="flex justify-between"><span>Fahrergehälter</span><span>{money(r.salaries)}</span></li>
                <li className="flex justify-between"><span>Personal</span><span>{money(r.staff)}</span></li>
                <li className="flex justify-between"><span>Anlagen</span><span>{money(r.facilities)}</span></li>
                <li className="flex justify-between"><span>Marketing</span><span>{money(r.marketing)}</span></li>
                <li className="flex justify-between"><span>Reisen</span><span>{money(r.travel)}</span></li>
              </ul>
            </div>
            <div className="sm:col-span-2 border-t border-border pt-2 font-display text-lg font-bold">
              Ergebnis: <span className={r.net >= 0 ? "text-accent" : "text-destructive"}>{money(r.net)}</span>
            </div>
          </div>
        )}
      </Panel>
    </div>
  );
}

/* ---------------- Events ---------------- */
export function EventsScreen() {
  const { state, actions } = useGame();
  if (!state) return null;
  const s = state;
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {s.events.map((ev) => {
        const track = TRACKS.find((t) => t.id === ev.trackId);
        return (
          <Panel key={ev.id} title={ev.name}>
            <p className="mb-2 text-sm text-muted-foreground">{ev.description}</p>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>Strecke: {track?.name ?? ev.trackId} {track ? `(${TRACK_KIND_LABELS[track.kind]})` : ""}</li>
              <li>Startgeld: {money(ev.entryFee)}</li>
              <li>Prämie: bis {money(ev.reward)}</li>
              <li>Ruf-Bonus: +{ev.reputation}</li>
            </ul>
            <Button
              className="mt-3"
              disabled={ev.done || s.team.money < ev.entryFee}
              onClick={() => actions.enterEvent(ev.id)}
            >
              {ev.done ? "Bereits gefahren" : "Teilnehmen"}
            </Button>
          </Panel>
        );
      })}
    </div>
  );
}

/* ---------------- Welt ---------------- */
export function WorldScreen() {
  const { state } = useGame();
  if (!state) return null;
  const s = state;
  const rec = s.world.records;
  const w = WEATHER_LABELS[s.weather.kind];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Generation" value={s.world.generation} />
        <Stat label="Wetter" value={`${w.icon} ${w.label}`} hint={`${s.weather.temperature}°C · Grip ${Math.round(s.weather.gripFactor * 100)}%`} />
        <Stat label="Legacy-Punkte" value={s.team.legacyPoints} />
        <Stat label="Aktive Fahrer" value={Object.values(s.drivers).filter((d) => !d.retired).length} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Rekorde">
          <ul className="space-y-1 text-sm">
            <li className="flex justify-between"><span className="text-muted-foreground">Meiste Siege</span><span>{rec.mostWins.name} ({rec.mostWins.value})</span></li>
            <li className="flex justify-between"><span className="text-muted-foreground">Meiste Titel</span><span>{rec.mostTitles.name} ({rec.mostTitles.value})</span></li>
            <li className="flex justify-between"><span className="text-muted-foreground">Meiste Punkte</span><span>{rec.mostPoints.name} ({rec.mostPoints.value})</span></li>
            <li className="flex justify-between"><span className="text-muted-foreground">Bestes Team</span><span>{rec.bestTeam.name} ({rec.bestTeam.value})</span></li>
          </ul>
        </Panel>
        <Panel title="Legenden">
          {s.world.legends.length === 0 && <p className="text-sm text-muted-foreground">Noch keine Legenden.</p>}
          <ul className="space-y-1 text-sm">{s.world.legends.map((l) => <li key={l}>🏅 {l}</li>)}</ul>
        </Panel>
      </div>

      <Panel title="Wettervorhersage">
        <div className="flex flex-wrap gap-2">
          {s.weather.forecast.map((k, i) => (
            <div key={i} className="rounded-lg bg-secondary/50 px-3 py-2 text-sm">
              {WEATHER_LABELS[k].icon} {WEATHER_LABELS[k].label}
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Historie">
        {s.world.archive.length === 0 && <p className="text-sm text-muted-foreground">Noch keine abgeschlossene Saison.</p>}
        <table className="w-full text-sm">
          <thead><tr className="label-xs text-left"><th className="py-1">Jahr</th><th>Champion</th><th>Team</th><th className="text-right">Eigene Platzierung</th></tr></thead>
          <tbody>
            {s.world.archive.map((a) => (
              <tr key={a.year} className="border-t border-border/60">
                <td className="py-1">{a.year}</td>
                <td>{a.championDriver}</td>
                <td className="text-xs text-muted-foreground">{a.championTeam}</td>
                <td className="text-right">P{a.playerPosition} · {a.playerPoints} Pkt</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>

      <Panel title="Nachrichten">
        <ul className="space-y-1 text-sm">
          {s.world.news.slice(0, 40).map((n) => (
            <li key={n.id} className="flex gap-2 border-b border-border/40 py-1">
              <Chip>{n.year}·R{n.round + 1}</Chip>
              <span className="text-muted-foreground">{n.text}</span>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

/* ---------------- Profil ---------------- */
export function ProfileScreen() {
  const { state } = useGame();
  if (!state) return null;
  const p = state.profile;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Profil" value={p.name} />
        <Stat label="Level" value={p.level} hint={`${p.xp}/${p.level * 500} XP`} />
        <Stat label="Rangliste" value={p.rating} />
        <Stat label="Erfolge" value={p.achievements.length} />
      </div>
      <Panel title="Fortschritt">
        <Bar value={(p.xp / (p.level * 500)) * 100} />
      </Panel>
      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Rangliste">
          <ol className="space-y-1 text-sm">
            {[...p.friends, { id: "me", name: p.name, rating: p.rating }]
              .sort((a, b) => b.rating - a.rating)
              .map((f, i) => (
                <li key={f.id} className={`flex justify-between rounded px-2 py-1 ${f.id === "me" ? "bg-primary/15" : ""}`}>
                  <span>{i + 1}. {f.name}</span>
                  <span className="text-muted-foreground">{f.rating}</span>
                </li>
              ))}
          </ol>
        </Panel>
        <Panel title="Clubs">
          <ul className="space-y-1 text-sm">
            {p.clubs.map((c) => (
              <li key={c.id} className="flex justify-between"><span>{c.name}</span><span className="text-muted-foreground">{c.members} Mitglieder</span></li>
            ))}
          </ul>
        </Panel>
        <Panel title="Erfolge">
          {p.achievements.length === 0 && <p className="text-sm text-muted-foreground">Noch keine Erfolge.</p>}
          <ul className="space-y-1 text-sm">{p.achievements.map((a) => <li key={a}>🏆 {a}</li>)}</ul>
        </Panel>
      </div>
    </div>
  );
}

/* ---------------- Premium ---------------- */
export function PremiumScreen() {
  const { state, actions } = useGame();
  if (!state) return null;
  const s = state;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Credits" value={s.premium.credits} />
        <Stat label="Speicherplätze" value={s.premium.saveSlots} />
        <Stat label="Theme" value={s.premium.theme} />
        <Stat label="Erweiterte Statistiken" value={s.premium.advancedStats ? "aktiv" : "inaktiv"} />
      </div>
      <Panel title="Kosmetik & Komfort">
        <p className="mb-3 text-xs text-muted-foreground">
          Alle Inhalte sind rein kosmetisch oder Komfortfunktionen – kein Einfluss auf die Rennleistung.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {PREMIUM_ITEMS.map((item) => {
            const owned = s.premium.owned.includes(item.id);
            return (
              <div key={item.id} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-display font-bold">{item.name}</span>
                  <Chip tone={owned ? "primary" : "accent"}>{owned ? "Besitz" : `${item.price} CR`}</Chip>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{item.desc}</p>
                <Button className="mt-2" disabled={owned || s.premium.credits < item.price} onClick={() => actions.buyPremium(item.id)}>
                  {owned ? "Freigeschaltet" : "Freischalten"}
                </Button>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
}
