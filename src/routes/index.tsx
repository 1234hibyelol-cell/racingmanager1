import { createFileRoute } from "@tanstack/react-router";
import { AdminScreen } from "@/components/game/admin";
import { LoadScreen, MainMenu, NewGameScreen, SettingsScreen } from "@/components/game/menus";
import { RaceScreen } from "@/components/game/race";
import { Button, Chip } from "@/components/game/ui";
import {
  BuildingsScreen,
  CarScreen,
  Dashboard,
  DriversScreen,
  MarketScreen,
  ResearchScreen,
  SeasonScreen,
  SponsorsScreen,
  StatsScreen,
} from "@/components/game/views";
import { money } from "@/game/engine";
import { GameContext, useGame, useGameEngine, type Screen } from "@/game/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Legends Grid – Racing Manager im Browser" },
      {
        name: "description",
        content:
          "Legends Grid: Gründe dein Motorsport-Team, entwickle das Auto, forsche, verpflichte Fahrer und gewinne die Meisterschaft.",
      },
      { property: "og:title", content: "Legends Grid – Racing Manager" },
      {
        property: "og:description",
        content: "Racing-Manager mit Fahrermarkt, Fahrzeugentwicklung, Forschung, Gebäuden und Rennsimulation.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: GameRoot,
});

function GameRoot() {
  const engine = useGameEngine();
  return (
    <GameContext.Provider value={engine}>
      <main className="min-h-screen">
        <Shell />
        {engine.toast && (
          <div className="panel glow fixed bottom-4 left-1/2 z-50 -translate-x-1/2 px-4 py-2 text-sm">
            {engine.toast}
          </div>
        )}
      </main>
    </GameContext.Provider>
  );
}

const NAV: { id: Screen; label: string }[] = [
  { id: "dashboard", label: "Dashboard" },
  { id: "drivers", label: "Fahrer" },
  { id: "market", label: "Markt" },
  { id: "car", label: "Fahrzeug" },
  { id: "research", label: "Forschung" },
  { id: "buildings", label: "Gebäude" },
  { id: "season", label: "Saison" },
  { id: "race", label: "Rennen" },
  { id: "sponsors", label: "Sponsoren" },
  { id: "stats", label: "Statistik" },
];

function Shell() {
  const { screen, setScreen, state, save } = useGame();

  if (screen === "menu") return <MainMenu />;
  if (screen === "newgame") return <NewGameScreen />;
  if (screen === "load") return <LoadScreen />;
  if (screen === "settings") return <SettingsScreen />;
  if (screen === "admin") return <AdminScreen />;
  if (!state) return <MainMenu />;

  return (
    <div className="mx-auto w-full max-w-6xl px-3 py-4 sm:px-5">
      <header className="panel stripe-top mb-4 flex flex-wrap items-center justify-between gap-3 p-4 pt-5">
        <div className="flex items-center gap-3">
          <span
            className="flex size-11 items-center justify-center rounded-lg text-xl"
            style={{ background: state.team.color }}
          >
            {state.team.logo}
          </span>
          <div>
            <h1 className="font-display text-xl font-black uppercase leading-none">{state.team.name}</h1>
            <div className="text-xs text-muted-foreground">
              Saison {state.season.year} · Runde {Math.min(state.season.round + 1, state.season.calendar.length)} ·{" "}
              {state.team.country}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone="accent">{money(state.team.money)}</Chip>
          <Chip tone="primary">Ruf {state.team.reputation}</Chip>
          <Button variant="ghost" onClick={() => save(1)}>Speichern</Button>
          <Button variant="ghost" onClick={() => setScreen("load")}>Slots</Button>
          <Button variant="ghost" onClick={() => setScreen("settings")}>⚙</Button>
          <Button variant="ghost" onClick={() => setScreen("menu")}>Menü</Button>
        </div>
      </header>

      <nav className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {NAV.map((n) => (
          <button
            key={n.id}
            onClick={() => setScreen(n.id)}
            className={`shrink-0 rounded-md px-3 py-2 font-display text-sm font-bold uppercase tracking-wide transition ${
              screen === n.id ? "speed-fill text-primary-foreground" : "bg-secondary text-muted-foreground hover:bg-elevated"
            }`}
          >
            {n.label}
          </button>
        ))}
      </nav>

      {screen === "dashboard" && <Dashboard />}
      {screen === "drivers" && <DriversScreen />}
      {screen === "market" && <MarketScreen />}
      {screen === "car" && <CarScreen />}
      {screen === "research" && <ResearchScreen />}
      {screen === "buildings" && <BuildingsScreen />}
      {screen === "season" && <SeasonScreen />}
      {screen === "race" && <RaceScreen />}
      {screen === "sponsors" && <SponsorsScreen />}
      {screen === "stats" && <StatsScreen />}
    </div>
  );
}
