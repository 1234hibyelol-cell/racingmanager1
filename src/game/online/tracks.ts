// Online-Strecken: Layout als SVG-Pfad für die Live-Streckenkarte (ViewBox 0 0 320 180).
export interface OnlineTrack {
  id: string;
  name: string;
  country: string;
  laps: number;
  power: number; // 0..1 Bedeutung Motorleistung
  corners: number; // 0..1 Bedeutung Kurventechnik
  path: string;
}

export const ONLINE_TRACKS: OnlineTrack[] = [
  {
    id: "aurora",
    name: "Aurora Bay",
    country: "Neo Lusitania",
    laps: 26,
    power: 0.6,
    corners: 0.4,
    path: "M40 140 C20 90 60 30 130 30 C200 30 200 80 250 80 C300 80 300 150 240 150 Z",
  },
  {
    id: "ferro",
    name: "Ferro Ring",
    country: "Valdania",
    laps: 30,
    power: 0.75,
    corners: 0.25,
    path: "M50 90 C50 30 270 30 270 90 C270 150 50 150 50 90 Z",
  },
  {
    id: "kaskade",
    name: "Kaskade Park",
    country: "Nordheim",
    laps: 24,
    power: 0.4,
    corners: 0.6,
    path: "M40 150 L100 150 C140 150 120 90 160 90 C200 90 180 40 240 40 C290 40 290 150 250 150 Z",
  },
  {
    id: "solara",
    name: "Solara Desert",
    country: "Al Rahim",
    laps: 22,
    power: 0.55,
    corners: 0.45,
    path: "M60 130 C30 60 120 20 170 60 C220 100 260 40 290 90 C310 130 200 170 60 130 Z",
  },
  {
    id: "nachtstadt",
    name: "Nachtstadt Circuit",
    country: "Republik Astra",
    laps: 28,
    power: 0.35,
    corners: 0.65,
    path: "M40 40 L280 40 L280 90 L160 90 L160 140 L40 140 Z",
  },
  {
    id: "monteverde",
    name: "Monteverde Pass",
    country: "Terra Verde",
    laps: 20,
    power: 0.45,
    corners: 0.55,
    path: "M50 150 C50 100 110 120 120 80 C130 40 200 30 230 60 C260 90 300 110 270 150 Z",
  },
  {
    id: "velocity",
    name: "Velocity Oval",
    country: "Pacifica",
    laps: 34,
    power: 0.85,
    corners: 0.15,
    path: "M60 60 L260 60 C295 60 295 120 260 120 L60 120 C25 120 25 60 60 60 Z",
  },
  {
    id: "havenport",
    name: "Havenport Docks",
    country: "Britannis",
    laps: 26,
    power: 0.5,
    corners: 0.5,
    path: "M40 120 L90 60 L170 60 L200 110 L270 110 L270 150 L40 150 Z",
  },
];

export function trackForRound(round: number): OnlineTrack {
  const list = ONLINE_TRACKS;
  return list[Math.abs(round - 1) % list.length]!;
}

export const WEATHER_ONLINE: Record<string, { label: string; icon: string; grip: number }> = {
  sun: { label: "Sonnig", icon: "☀️", grip: 1 },
  rain: { label: "Regen", icon: "🌧️", grip: 0.9 },
  storm: { label: "Sturm", icon: "⛈️", grip: 0.84 },
  fog: { label: "Nebel", icon: "🌫️", grip: 0.93 },
  heat: { label: "Hitze", icon: "🔥", grip: 0.96 },
  night: { label: "Nacht", icon: "🌙", grip: 0.95 },
};
