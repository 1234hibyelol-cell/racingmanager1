// Online-Hub: Liga, Team-HQ, Forschungsbaum, Entwicklung, Sponsoren, Chat, Freunde, Ranglisten.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Bar, Button, Chip, Panel, Stat } from "@/components/game/ui";
import {
  BRANCH_LABELS,
  HQ_KEYS,
  HQ_LABELS,
  HQ_MAX,
  hqCost,
  money,
  ONLINE_SPONSORS,
  RESEARCH_NODES,
  SEASON_ROUNDS,
  STAFF_LABELS,
  STAFF_ROLES,
  TRAIN_DRIVER_COST,
  TRAIN_STAFF_COST,
  teamStrength,
} from "@/game/online/config";
import { supabase } from "@/integrations/supabase/client";
import {
  createOnlineLeague,
  joinLeague,
  requestFriend,
  renameProfile,
  respondFriend,
  setStrategy,
  signSponsor,
  tickNow,
  trainDriver,
  trainStaff,
  unlockResearch,
  upgradeHq,
} from "@/lib/online.functions";


/* eslint-disable @typescript-eslint/no-explicit-any */
const db = supabase as any;

type Tab = "liga" | "hq" | "forschung" | "team" | "sponsoren" | "sozial" | "rangliste";
const TABS: { id: Tab; label: string }[] = [
  { id: "liga", label: "Liga & Rennen" },
  { id: "hq", label: "Team-HQ" },
  { id: "forschung", label: "Forschung" },
  { id: "team", label: "Fahrer & Personal" },
  { id: "sponsoren", label: "Sponsoren" },
  { id: "sozial", label: "Chat & Freunde" },
  { id: "rangliste", label: "Ranglisten" },
];

export function OnlineHub() {
  const [tab, setTab] = useState<Tab>("liga");
  const qc = useQueryClient();
  const navigate = useNavigate();

  const me = useQuery({
    queryKey: ["online-me"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) return null;
      const { data: profile } = await db.from("profiles").select("*").eq("id", user.id).maybeSingle();
      const { data: team } = await db.from("teams").select("*").eq("user_id", user.id).maybeSingle();
      const { data: league } = team
        ? await db.from("leagues").select("*").eq("id", team.league_id).maybeSingle()
        : { data: null };
      return { user, profile, team, league };
    },
    refetchInterval: 20_000,
  });

  const leagueId = me.data?.team?.league_id as string | undefined;

  const standings = useQuery({
    queryKey: ["online-standings", leagueId],
    enabled: !!leagueId,
    refetchInterval: 20_000,
    queryFn: async () => {
      const { data } = await db
        .from("teams")
        .select("*")
        .eq("league_id", leagueId)
        .order("points", { ascending: false });
      return (data ?? []) as any[];
    },
  });

  const races = useQuery({
    queryKey: ["online-races", leagueId],
    enabled: !!leagueId,
    refetchInterval: 15_000,
    queryFn: async () => {
      const { data } = await db
        .from("races")
        .select("*")
        .eq("league_id", leagueId)
        .order("round", { ascending: false })
        .limit(8);
      return (data ?? []) as any[];
    },
  });

  const ranking = useQuery({
    queryKey: ["online-ranking"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { data } = await db.from("profiles").select("id,username,rating,xp").order("rating", { ascending: false }).limit(25);
      return (data ?? []) as any[];
    },
  });

  const history = useQuery({
    queryKey: ["online-history", leagueId],
    enabled: !!leagueId,
    queryFn: async () => {
      const { data } = await db
        .from("season_results")
        .select("*")
        .eq("league_id", leagueId)
        .order("season", { ascending: false })
        .order("position", { ascending: true })
        .limit(40);
      return (data ?? []) as any[];
    },
  });

  const invalidateAll = () => {
    void qc.invalidateQueries({ queryKey: ["online-me"] });
    void qc.invalidateQueries({ queryKey: ["online-standings"] });
  };

  const run =
    <A extends unknown[]>(fn: (...args: A) => Promise<unknown>, ok: string) =>
    async (...args: A) => {
      try {
        await fn(...args);
        toast.success(ok);
        invalidateAll();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Aktion fehlgeschlagen");
      }
    };


  const joinFn = useServerFn(joinLeague);
  const createLeagueFn = useServerFn(createOnlineLeague);
  const tickFn = useServerFn(tickNow);
  const hqFn = useServerFn(upgradeHq);
  const researchFn = useServerFn(unlockResearch);
  const driverFn = useServerFn(trainDriver);
  const staffFn = useServerFn(trainStaff);
  const sponsorFn = useServerFn(signSponsor);
  const strategyFn = useServerFn(setStrategy);
  const renameFn = useServerFn(renameProfile);


  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  if (me.isLoading) return <main className="p-6">Lade Online-Daten …</main>;

  const team = me.data?.team;
  const league = me.data?.league;
  const profile = me.data?.profile;
  const liveRace = (races.data ?? []).find((r) => r.status === "running");

  return (
    <main className="mx-auto max-w-6xl space-y-4 p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-bold uppercase">Legends Grid Online</h1>
          <p className="text-xs text-muted-foreground">
            {profile?.username} · Rating {profile?.rating} · {profile?.xp} XP
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/"><Button variant="ghost">Solo-Karriere</Button></Link>
          <Button variant="ghost" onClick={signOut}>Abmelden</Button>
        </div>
      </header>

      {!team && <JoinCard onJoin={run(async (v: { teamName: string; color: string }) => joinFn({ data: v }), "Team registriert!")} />}

      {team && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <Stat label="Team" value={team.name} hint={league?.name ?? ""} />
            <Stat label="Budget" value={money(team.budget)} hint={`Sponsor ${money(Number((team.sponsor ?? {}).perRace ?? 0))}/Rennen`} />
            <Stat label="Punkte" value={team.points} hint={`Siege ${team.wins}`} />
            <Stat label="Stärke" value={teamStrength(team)} hint={`Strategie ${team.strategy}`} />
            <Stat
              label={liveRace ? "Rennen live" : "Nächstes Rennen"}
              value={liveRace ? `Runde ${liveRace.current_lap}/${liveRace.laps}` : countdown(league?.next_race_at)}
              hint={liveRace ? liveRace.track_name : `Saison ${league?.season} · Lauf ${(league?.round ?? 0) + 1}/${SEASON_ROUNDS}`}
            />
          </div>

          <nav className="flex flex-wrap gap-2">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`rounded-lg border px-3 py-1 text-sm ${tab === t.id ? "border-primary bg-primary/10" : "border-border bg-secondary/40"}`}
              >
                {t.label}
              </button>
            ))}
          </nav>

          {tab === "liga" && (
            <div className="grid gap-4 lg:grid-cols-2">
              <Panel title={`Tabelle · ${league?.name ?? ""}`}>
                <ol className="space-y-1 text-sm">
                  {(standings.data ?? []).map((t, i) => (
                    <li
                      key={t.id}
                      className={`flex items-center justify-between rounded px-2 py-1 ${t.id === team.id ? "bg-primary/15" : ""}`}
                    >
                      <span className="flex items-center gap-2">
                        <span className="w-6 text-muted-foreground">{i + 1}.</span>
                        <span className="inline-block h-3 w-3 rounded-full" style={{ background: t.color }} />
                        {t.name}
                        {!t.is_bot && <Chip tone="accent">Spieler</Chip>}
                      </span>
                      <span className="font-bold">{t.points}</span>
                    </li>
                  ))}
                </ol>
              </Panel>
              <div className="space-y-4">
                <Panel title="Rennen">
                  {liveRace ? (
                    <div className="space-y-2">
                      <p className="text-sm">
                        Live: {liveRace.track_name} – Runde {liveRace.current_lap}/{liveRace.laps}
                      </p>
                      <Link to="/race/$raceId" params={{ raceId: liveRace.id }}>
                        <Button variant="primary">Zum Live-Rennen</Button>
                      </Link>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Nächster Start: {countdown(league?.next_race_at)} – Rennen starten automatisch jede Stunde und werden
                      serverseitig simuliert.
                    </p>
                  )}
                  <div className="mt-3 space-y-1 text-sm">
                    {(races.data ?? []).map((r) => (
                      <Link
                        key={r.id}
                        to="/race/$raceId"
                        params={{ raceId: r.id }}
                        className="flex justify-between rounded px-2 py-1 hover:bg-secondary/50"
                      >
                        <span>Lauf {r.round} · {r.track_name}</span>
                        <span className="text-xs text-muted-foreground">
                          {r.status === "finished" ? "beendet" : r.status === "running" ? "live" : "geplant"}
                        </span>
                      </Link>
                    ))}
                  </div>
                </Panel>
                <Panel title="Standardstrategie">
                  <div className="flex gap-2">
                    {["push", "normal", "conserve"].map((s) => (
                      <Button
                        key={s}
                        variant={team.strategy === s ? "primary" : "ghost"}
                        onClick={run(async () => strategyFn({ data: { strategy: s } }), "Strategie gespeichert")}
                      >
                        {s === "push" ? "Angriff" : s === "normal" ? "Normal" : "Schonen"}
                      </Button>
                    ))}
                  </div>
                </Panel>
                <Panel title="Saison-Historie">
                  {(history.data ?? []).length === 0 && (
                    <p className="text-sm text-muted-foreground">Noch keine abgeschlossene Saison.</p>
                  )}
                  <ul className="space-y-1 text-sm">
                    {(history.data ?? []).slice(0, 12).map((h) => (
                      <li key={h.id} className="flex justify-between">
                        <span>S{h.season} · P{h.position} {h.team_name}</span>
                        <span className="text-xs text-muted-foreground">{h.points} Pkt</span>
                      </li>
                    ))}
                  </ul>
                </Panel>
              </div>
            </div>
          )}

          {tab === "hq" && (
            <Panel title="Team-Hauptquartier">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {HQ_KEYS.map((k) => {
                  const level = Number((team.hq ?? {})[k] ?? 1);
                  return (
                    <div key={k} className="rounded-lg bg-secondary/50 p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-display font-bold">{HQ_LABELS[k].label}</span>
                        <Chip>Stufe {level}/{HQ_MAX}</Chip>
                      </div>
                      <p className="text-xs text-muted-foreground">{HQ_LABELS[k].desc}</p>
                      <Bar value={(level / HQ_MAX) * 100} />
                      <Button
                        className="mt-2"
                        disabled={level >= HQ_MAX || team.budget < hqCost(level)}
                        onClick={run(async () => hqFn({ data: { key: k } }), "Ausbau abgeschlossen")}
                      >
                        Ausbauen · {money(hqCost(level))}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </Panel>
          )}

          {tab === "forschung" && (
            <Panel title="Forschungsbaum">
              <div className="grid gap-4 lg:grid-cols-5">
                {(["engine", "aero", "chassis", "tyres", "reliability"] as const).map((branch) => {
                  const unlocked: string[] = ((team.research ?? {}).unlocked ?? []) as string[];
                  return (
                    <div key={branch} className="space-y-2">
                      <h4 className="label-xs">{BRANCH_LABELS[branch]} · {Number((team.research ?? {})[branch] ?? 0)}</h4>
                      {RESEARCH_NODES.filter((n) => n.branch === branch).map((n) => {
                        const done = unlocked.includes(n.id);
                        const locked = !!n.requires && !unlocked.includes(n.requires);
                        return (
                          <div
                            key={n.id}
                            className={`rounded-lg border p-2 text-xs ${done ? "border-primary bg-primary/10" : "border-border bg-secondary/40"}`}
                          >
                            <div className="font-bold">{n.label}</div>
                            <div className="text-muted-foreground">+{n.gain} {BRANCH_LABELS[branch]}</div>
                            {done ? (
                              <Chip tone="accent">Erforscht</Chip>
                            ) : (
                              <Button
                                className="mt-1"
                                disabled={locked || team.budget < n.cost}
                                onClick={run(async () => researchFn({ data: { nodeId: n.id } }), "Forschung abgeschlossen")}
                              >
                                {locked ? "Gesperrt" : money(n.cost)}
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </Panel>
          )}

          {tab === "team" && (
            <div className="grid gap-4 lg:grid-cols-2">
              <Panel title="Fahrerentwicklung">
                {(team.drivers ?? []).map((d: any, i: number) => (
                  <div key={i} className="mb-3 rounded-lg bg-secondary/50 p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-display font-bold">{i === 0 ? "Stammfahrer" : "Ersatzfahrer"}: {d.name}</span>
                      <Chip tone="accent">Rating {d.rating}</Chip>
                    </div>
                    <Bar value={d.rating} />
                    <div className="mt-1 flex gap-2 text-xs text-muted-foreground">
                      <span>Form {d.form}</span>
                      <span>Regen {d.wet}</span>
                    </div>
                    <Button
                      className="mt-2"
                      disabled={team.budget < TRAIN_DRIVER_COST}
                      onClick={run(async () => driverFn({ data: { index: i } }), "Trainingseinheit absolviert")}
                    >
                      Training · {money(TRAIN_DRIVER_COST)}
                    </Button>
                  </div>
                ))}
              </Panel>
              <Panel title="Personalentwicklung">
                {STAFF_ROLES.map((role) => (
                  <div key={role} className="mb-3 rounded-lg bg-secondary/50 p-3">
                    <div className="flex items-center justify-between">
                      <span className="font-display font-bold">{STAFF_LABELS[role]}</span>
                      <Chip>{Number((team.staff ?? {})[role] ?? 40)}</Chip>
                    </div>
                    <Bar value={Number((team.staff ?? {})[role] ?? 40)} />
                    <Button
                      className="mt-2"
                      disabled={team.budget < TRAIN_STAFF_COST}
                      onClick={run(async () => staffFn({ data: { role } }), "Personal geschult")}
                    >
                      Schulung · {money(TRAIN_STAFF_COST)}
                    </Button>
                  </div>
                ))}
              </Panel>
            </div>
          )}

          {tab === "sponsoren" && (
            <Panel title="Sponsorensystem">
              <p className="mb-3 text-sm text-muted-foreground">
                Aktuell: {(team.sponsor ?? {}).name ?? "kein Sponsor"} · {money(Number((team.sponsor ?? {}).perRace ?? 0))} pro Rennen
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {ONLINE_SPONSORS.map((s) => (
                  <div key={s.id} className="rounded-lg bg-secondary/50 p-3">
                    <div className="font-display font-bold">{s.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {money(s.perRace)}/Rennen · Bonus {money(s.signing)} · Rating ≥ {s.minRating}
                    </div>
                    <Button
                      className="mt-2"
                      disabled={(profile?.rating ?? 1000) < s.minRating}
                      onClick={run(async () => sponsorFn({ data: { sponsorId: s.id } }), "Vertrag unterschrieben")}
                    >
                      Unterschreiben
                    </Button>
                  </div>
                ))}
              </div>
            </Panel>
          )}

          {tab === "sozial" && <SocialPanels leagueId={leagueId!} userId={me.data!.user.id} username={profile?.username ?? "Spieler"} />}

          {tab === "rangliste" && (
            <div className="grid gap-4 lg:grid-cols-2">
              <Panel title="Globale Rangliste">
                <ol className="space-y-1 text-sm">
                  {(ranking.data ?? []).map((p, i) => (
                    <li key={p.id} className={`flex justify-between rounded px-2 py-1 ${p.id === me.data?.user.id ? "bg-primary/15" : ""}`}>
                      <span>{i + 1}. {p.username}</span>
                      <span className="font-bold">{p.rating}</span>
                    </li>
                  ))}
                </ol>
              </Panel>
              <Panel title="Profil">
                <RenameForm
                  current={profile?.username ?? ""}
                  onSave={run(async (username: string) => renameFn({ data: { username } }), "Name geändert")}
                />
              </Panel>
            </div>
          )}
        </>
      )}
    </main>
  );
}

function countdown(iso?: string | null) {
  if (!iso) return "—";
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "jetzt";
  const m = Math.floor(ms / 60_000);
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
}

function JoinCard({ onJoin }: { onJoin: (v: { teamName: string; color: string }) => Promise<void> }) {
  const [teamName, setName] = useState("");
  const [color, setColor] = useState("#e11d48");
  const [busy, setBusy] = useState(false);
  return (
    <Panel title="Liga beitreten">
      <p className="mb-3 text-sm text-muted-foreground">
        Du übernimmst ein Team in einer Liga mit 20 Teams. Rennen starten automatisch jede Stunde und werden serverseitig
        simuliert – du kannst live eingreifen.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="label-xs" htmlFor="tn">Teamname</label>
          <input
            id="tn"
            value={teamName}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-border bg-secondary/40 px-3 py-2"
          />
        </div>
        <div>
          <label className="label-xs" htmlFor="tc">Teamfarbe</label>
          <input id="tc" type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-16 rounded-lg" />
        </div>
        <Button
          variant="primary"
          disabled={teamName.trim().length < 3 || busy}
          onClick={async () => {
            setBusy(true);
            await onJoin({ teamName: teamName.trim(), color });
            setBusy(false);
          }}
        >
          Team registrieren
        </Button>
      </div>
    </Panel>
  );
}

function RenameForm({ current, onSave }: { current: string; onSave: (v: string) => Promise<void> }) {
  const [value, setValue] = useState(current);
  return (
    <div className="flex items-end gap-2">
      <div>
        <label className="label-xs" htmlFor="un">Anzeigename</label>
        <input
          id="un"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="rounded-lg border border-border bg-secondary/40 px-3 py-2"
        />
      </div>
      <Button onClick={() => onSave(value)}>Speichern</Button>
    </div>
  );
}

function SocialPanels({ leagueId, userId, username }: { leagueId: string; userId: string; username: string }) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [friendName, setFriendName] = useState("");
  const friendFn = useServerFn(requestFriend);
  const respondFn = useServerFn(respondFriend);

  const chat = useQuery({
    queryKey: ["online-chat", leagueId],
    queryFn: async () => {
      const { data } = await db
        .from("chat_messages")
        .select("*")
        .eq("league_id", leagueId)
        .order("created_at", { ascending: false })
        .limit(50);
      return ((data ?? []) as any[]).reverse();
    },
  });

  const friends = useQuery({
    queryKey: ["online-friends", userId],
    queryFn: async () => {
      const { data } = await db.from("friendships").select("*").order("created_at", { ascending: false });
      const rows = (data ?? []) as any[];
      const ids = [...new Set(rows.flatMap((r) => [r.user_id, r.friend_id]))].filter((id) => id !== userId);
      const { data: profs } = ids.length
        ? await db.from("profiles").select("id,username,rating").in("id", ids)
        : { data: [] };
      const map = new Map(((profs ?? []) as any[]).map((p) => [p.id, p]));
      return rows.map((r) => ({ ...r, other: map.get(r.user_id === userId ? r.friend_id : r.user_id) }));
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`league-chat-${leagueId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: `league_id=eq.${leagueId}` }, () => {
        void qc.invalidateQueries({ queryKey: ["online-chat", leagueId] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [leagueId, qc]);

  const send = useMutation({
    mutationFn: async () => {
      const message = text.trim();
      if (!message) return;
      const { error } = await db.from("chat_messages").insert({ league_id: leagueId, user_id: userId, username, message });
      if (error) throw error;
      setText("");
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Senden fehlgeschlagen"),
  });

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Liga-Chat">
        <div className="mb-3 max-h-72 space-y-1 overflow-y-auto text-sm">
          {(chat.data ?? []).map((m) => (
            <div key={m.id}>
              <span className="font-bold text-accent">{m.username}</span>{" "}
              <span className="text-muted-foreground">{m.message}</span>
            </div>
          ))}
          {(chat.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">Noch keine Nachrichten.</p>}
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send.mutate();
          }}
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={500}
            placeholder="Nachricht an die Liga"
            className="flex-1 rounded-lg border border-border bg-secondary/40 px-3 py-2"
          />
          <Button variant="primary">Senden</Button>
        </form>
      </Panel>
      <Panel title="Freundesliste">
        <div className="mb-3 flex items-end gap-2">
          <div>
            <label className="label-xs" htmlFor="fn">Spielername</label>
            <input
              id="fn"
              value={friendName}
              onChange={(e) => setFriendName(e.target.value)}
              className="rounded-lg border border-border bg-secondary/40 px-3 py-2"
            />
          </div>
          <Button
            onClick={async () => {
              try {
                await friendFn({ data: { username: friendName.trim() } });
                toast.success("Anfrage gesendet");
                setFriendName("");
                void qc.invalidateQueries({ queryKey: ["online-friends", userId] });
              } catch (error) {
                toast.error(error instanceof Error ? error.message : "Fehlgeschlagen");
              }
            }}
          >
            Anfragen
          </Button>
        </div>
        <ul className="space-y-2 text-sm">
          {(friends.data ?? []).map((f) => (
            <li key={f.id} className="flex items-center justify-between rounded bg-secondary/50 px-2 py-1">
              <span>
                {f.other?.username ?? "Unbekannt"}{" "}
                <Chip>{f.status === "accepted" ? "Freund" : f.user_id === userId ? "angefragt" : "Anfrage"}</Chip>
              </span>
              {f.status === "pending" && f.friend_id === userId && (
                <span className="flex gap-1">
                  <Button
                    onClick={async () => {
                      await respondFn({ data: { id: f.id, accept: true } });
                      void qc.invalidateQueries({ queryKey: ["online-friends", userId] });
                    }}
                  >
                    Annehmen
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={async () => {
                      await respondFn({ data: { id: f.id, accept: false } });
                      void qc.invalidateQueries({ queryKey: ["online-friends", userId] });
                    }}
                  >
                    Ablehnen
                  </Button>
                </span>
              )}
            </li>
          ))}
          {(friends.data ?? []).length === 0 && <p className="text-muted-foreground">Noch keine Freunde hinzugefügt.</p>}
        </ul>
      </Panel>
    </div>
  );
}
