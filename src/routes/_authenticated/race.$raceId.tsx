// Live-Rennen: Streckenkarte, Live-Timing, Ereignis-Feed und Eingriffe während des Rennens.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { toast } from "sonner";
import { Button, Chip, Panel, Stat } from "@/components/game/ui";
import { ONLINE_TRACKS } from "@/game/online/tracks";
import { supabase } from "@/integrations/supabase/client";
import { sendRaceOrder } from "@/lib/online.functions";

/* eslint-disable @typescript-eslint/no-explicit-any */
const db = supabase as any;

export const Route = createFileRoute("/_authenticated/race/$raceId")({
  head: () => ({
    meta: [
      { title: "Live-Rennen – Legends Grid" },
      { name: "description", content: "Live-Timing, Streckenkarte, Ereignis-Feed und Boxenfunk in Echtzeit." },
      { property: "og:title", content: "Live-Rennen – Legends Grid" },
      { property: "og:description", content: "Live-Timing, Streckenkarte und Live-Eingriffe im Online-Rennen." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: LiveRace,
});

const ORDERS = [
  { id: "push", label: "Angriff" },
  { id: "normal", label: "Normal" },
  { id: "conserve", label: "Reifen schonen" },
  { id: "pit", label: "Boxenstopp" },
];

function LiveRace() {
  const { raceId } = Route.useParams();
  const qc = useQueryClient();
  const orderFn = useServerFn(sendRaceOrder);

  const race = useQuery({
    queryKey: ["race", raceId],
    refetchInterval: 5000,
    queryFn: async () => {
      const { data: r } = await db.from("races").select("*").eq("id", raceId).maybeSingle();
      const { data: entries } = await db
        .from("race_entries")
        .select("*")
        .eq("race_id", raceId)
        .order("position", { ascending: true });
      const { data: events } = await db
        .from("race_events")
        .select("*")
        .eq("race_id", raceId)
        .order("created_at", { ascending: false })
        .limit(40);
      const { data: auth } = await supabase.auth.getUser();
      const { data: myTeam } = auth.user
        ? await db.from("teams").select("id,name").eq("user_id", auth.user.id).maybeSingle()
        : { data: null };
      return { race: r, entries: (entries ?? []) as any[], events: (events ?? []) as any[], myTeam };
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`race-${raceId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "race_entries", filter: `race_id=eq.${raceId}` }, () => {
        void qc.invalidateQueries({ queryKey: ["race", raceId] });
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "race_events", filter: `race_id=eq.${raceId}` }, () => {
        void qc.invalidateQueries({ queryKey: ["race", raceId] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [raceId, qc]);

  if (race.isLoading) return <main className="p-6">Lade Rennen …</main>;
  const r = race.data?.race;
  if (!r) return <main className="p-6">Rennen nicht gefunden.</main>;

  const entries = race.data!.entries;
  const track = ONLINE_TRACKS.find((t) => t.id === r.track_id) ?? ONLINE_TRACKS[0]!;
  const mine = entries.find((e) => e.team_id === race.data?.myTeam?.id);
  const progress = r.laps ? r.current_lap / r.laps : 0;

  return (
    <main className="mx-auto max-w-6xl space-y-4 p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="font-display text-2xl font-bold uppercase">{r.track_name}</h1>
        <Link to="/online"><Button variant="ghost">Zurück zur Liga</Button></Link>
      </header>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Status" value={r.status === "running" ? "Live" : r.status === "finished" ? "Beendet" : "Geplant"} hint={`Runde ${r.current_lap}/${r.laps}`} />
        <Stat label="Wetter" value={String(r.weather ?? "sun")} hint={`Safety Car: ${r.safety_car ? "aktiv" : "nein"}`} />
        <Stat label="Strecke" value={track.name} hint={`${track.country} · ${track.laps} Runden`} />
        <Stat label="Dein Team" value={race.data?.myTeam?.name ?? "—"} hint={mine ? `P${mine.position ?? "-"} · Reifen ${Math.round(100 - (mine.tyre_wear ?? 0))}%` : "nicht am Start"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Streckenkarte">
          <svg viewBox="0 0 320 180" className="w-full">
            <path d={track.path} fill="none" stroke="hsl(var(--border))" strokeWidth="6" strokeLinecap="round" />
            <path
              d={track.path}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="2"
              strokeDasharray="1 0"
              pathLength={1}
              strokeDashoffset={0}
              opacity={0.35}
            />
            {entries.slice(0, 20).map((e) => (
              <circle key={e.id} r={e.team_id === race.data?.myTeam?.id ? 4 : 2.6} fill={e.color ?? "#fff"}>
                <animateMotion dur="0.01s" fill="freeze" keyPoints={`${carOffset(e, progress)};${carOffset(e, progress)}`} keyTimes="0;1" path={track.path} />
              </circle>
            ))}
          </svg>
          <p className="mt-2 text-xs text-muted-foreground">
            Positionen aktualisieren sich live über den Server-Tick ({r.current_lap}/{r.laps} Runden).
          </p>
        </Panel>

        <Panel title="Live-Timing">
          <table className="w-full text-sm">
            <thead>
              <tr className="label-xs text-left"><th className="py-1">Pos</th><th>Team</th><th>Fahrer</th><th>Reifen</th><th className="text-right">Lücke</th></tr>
            </thead>
            <tbody>
              {entries.slice(0, 20).map((e) => (
                <tr key={e.id} className={`border-t border-border/60 ${e.team_id === race.data?.myTeam?.id ? "text-accent" : ""}`}>
                  <td className="py-1">{e.dnf ? "DNF" : (e.position ?? "-")}</td>
                  <td>{e.team_name}</td>
                  <td className="text-xs text-muted-foreground">{e.driver_name}</td>
                  <td className="text-xs">{Math.round(100 - (e.tyre_wear ?? 0))}%</td>
                  <td className="text-right text-xs">{e.gap ? `+${Number(e.gap).toFixed(1)}s` : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>

      {mine && r.status === "running" && (
        <Panel title="Boxenfunk · Live-Eingriff">
          <div className="flex flex-wrap gap-2">
            {ORDERS.map((o) => (
              <Button
                key={o.id}
                variant={mine.order === o.id ? "primary" : "ghost"}
                onClick={async () => {
                  try {
                    await orderFn({ data: { raceId, order: o.id } });
                    toast.success(`Anweisung: ${o.label}`);
                    void qc.invalidateQueries({ queryKey: ["race", raceId] });
                  } catch (error) {
                    toast.error(error instanceof Error ? error.message : "Anweisung fehlgeschlagen");
                  }
                }}
              >
                {o.label}
              </Button>
            ))}
            <Chip tone="accent">Aktuell: {mine.order ?? "normal"}</Chip>
          </div>
        </Panel>
      )}

      <Panel title="Ereignis-Feed">
        <ul className="space-y-1 text-sm">
          {race.data!.events.map((e) => (
            <li key={e.id}>
              <span className="text-xs text-muted-foreground">R{e.lap} · </span>
              {e.message}
            </li>
          ))}
          {race.data!.events.length === 0 && <p className="text-sm text-muted-foreground">Noch keine Ereignisse.</p>}
        </ul>
      </Panel>
    </main>
  );
}

function carOffset(entry: any, progress: number) {
  const pos = Number(entry.position ?? 10);
  const base = progress - pos * 0.004;
  const v = ((base % 1) + 1) % 1;
  return v.toFixed(4);
}
