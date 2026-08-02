// Statische Spieldaten: Namen, Länder, Strecken, Sponsoren, Balancing, Bauphase-2-Inhalte.
import type {
  BuildingKey,
  Championship,
  Difficulty,
  PartKey,
  ResearchKey,
  StaffRole,
  TrackKind,
  WeatherKind,
} from "./types";

export const FIRST_NAMES = [
  "Luca","Mateo","Elias","Noah","Kai","Jonas","Enzo","Diego","Nikita","Hugo",
  "Oscar","Milan","Aiden","Leon","Theo","Ravi","Yuki","Hiro","Marco","Pablo",
  "Sven","Anders","Emil","Felix","Ruben","Tomas","Dario","Ivan","Sami","Nils",
  "Adrian","Bruno","Cesar","Dennis","Erik","Fabio","Gabriel","Henrik","Idris","Jules",
];

export const LAST_NAMES = [
  "Voss","Marchetti","Delacroix","Ferreira","Kowalski","Nakamura","Alvarez","Bergqvist",
  "Novak","Rossi","Lindqvist","Okafor","Duarte","Hartmann","Vasquez","Petrov","Sokolov",
  "Sandberg","Moretti","Fontaine","Bianchi","Halvorsen","Castillo","Nielsen","Weber",
  "Silva","Karlsson","Baumgartner","Renard","Costa","Yamada","Schneider","Laurent",
  "Mendoza","Brandt","Okonkwo","Rinaldi","Persson","Aguilar","Zimmer",
];

export const COUNTRIES = [
  "Deutschland","Italien","Frankreich","Spanien","Brasilien","Japan","Schweden",
  "Niederlande","Belgien","Österreich","Finnland","Portugal","Mexiko","Kanada",
  "Australien","Polen","Dänemark","Schweiz","Argentinien","Norwegen",
];

export const PERSONALITIES = [
  "Ehrgeizig","Ruhig","Hitzköpfig","Analytisch","Charismatisch","Bescheiden",
  "Perfektionist","Teamplayer","Einzelgänger","Showman","Kämpfernatur","Diplomat",
];

export interface TrackDef {
  id: string;
  name: string;
  country: string;
  power: number;
  corners: number;
  brakes: number;
  laps: number;
  kind: TrackKind;
  lengthKm: number;
  cornerCount: number;
  tyreWear: number; // 1..10
  overtaking: number; // 1..10
  rainChance: number; // 0..1
}

export const TRACKS: TrackDef[] = [
  { id: "monza", name: "Autodromo Reale", country: "Italien", power: 0.5, corners: 0.2, brakes: 0.3, laps: 53, kind: "speed", lengthKm: 5.8, cornerCount: 11, tyreWear: 5, overtaking: 8, rainChance: 0.2 },
  { id: "alpen", name: "Alpenring", country: "Österreich", power: 0.4, corners: 0.35, brakes: 0.25, laps: 71, kind: "mountain", lengthKm: 4.3, cornerCount: 10, tyreWear: 6, overtaking: 7, rainChance: 0.35 },
  { id: "harbor", name: "Harbour Street", country: "Monaco", power: 0.15, corners: 0.55, brakes: 0.3, laps: 78, kind: "street", lengthKm: 3.3, cornerCount: 19, tyreWear: 4, overtaking: 2, rainChance: 0.25 },
  { id: "dunes", name: "Dünen-Kurs", country: "Niederlande", power: 0.3, corners: 0.45, brakes: 0.25, laps: 72, kind: "technical", lengthKm: 4.2, cornerCount: 14, tyreWear: 7, overtaking: 4, rainChance: 0.4 },
  { id: "sakura", name: "Sakura Circuit", country: "Japan", power: 0.3, corners: 0.45, brakes: 0.25, laps: 53, kind: "technical", lengthKm: 5.6, cornerCount: 18, tyreWear: 7, overtaking: 5, rainChance: 0.4 },
  { id: "estoril", name: "Costa Verde", country: "Portugal", power: 0.35, corners: 0.4, brakes: 0.25, laps: 66, kind: "technical", lengthKm: 4.6, cornerCount: 15, tyreWear: 6, overtaking: 5, rainChance: 0.3 },
  { id: "desert", name: "Desert Bowl", country: "Katar", power: 0.4, corners: 0.35, brakes: 0.25, laps: 57, kind: "desert", lengthKm: 5.4, cornerCount: 16, tyreWear: 8, overtaking: 6, rainChance: 0.02 },
  { id: "lakeside", name: "Lakeside Park", country: "Kanada", power: 0.45, corners: 0.25, brakes: 0.3, laps: 70, kind: "speed", lengthKm: 4.4, cornerCount: 12, tyreWear: 5, overtaking: 8, rainChance: 0.3 },
  { id: "highveld", name: "Highveld Speedway", country: "Südafrika", power: 0.45, corners: 0.3, brakes: 0.25, laps: 60, kind: "speed", lengthKm: 5.1, cornerCount: 13, tyreWear: 6, overtaking: 7, rainChance: 0.15 },
  { id: "pampas", name: "Pampas International", country: "Argentinien", power: 0.35, corners: 0.4, brakes: 0.25, laps: 63, kind: "technical", lengthKm: 4.8, cornerCount: 15, tyreWear: 6, overtaking: 5, rainChance: 0.25 },
  { id: "nordwald", name: "Nordwald Arena", country: "Deutschland", power: 0.4, corners: 0.35, brakes: 0.25, laps: 67, kind: "mountain", lengthKm: 5.2, cornerCount: 16, tyreWear: 6, overtaking: 6, rainChance: 0.35 },
  { id: "sunset", name: "Sunset Bay", country: "Australien", power: 0.35, corners: 0.35, brakes: 0.3, laps: 58, kind: "street", lengthKm: 4.0, cornerCount: 17, tyreWear: 5, overtaking: 3, rainChance: 0.2 },
  { id: "neonmile", name: "Neon Mile", country: "Singapur", power: 0.3, corners: 0.5, brakes: 0.2, laps: 61, kind: "night", lengthKm: 4.9, cornerCount: 21, tyreWear: 7, overtaking: 3, rainChance: 0.45 },
  { id: "saltflats", name: "Salt Flats Ring", country: "Vereinigte Staaten", power: 0.55, corners: 0.2, brakes: 0.25, laps: 55, kind: "desert", lengthKm: 6.1, cornerCount: 9, tyreWear: 8, overtaking: 9, rainChance: 0.05 },
  { id: "granito", name: "Sierra Granito", country: "Chile", power: 0.35, corners: 0.45, brakes: 0.2, laps: 64, kind: "mountain", lengthKm: 5.5, cornerCount: 18, tyreWear: 7, overtaking: 4, rainChance: 0.3 },
  { id: "midnight", name: "Midnight Harbour", country: "Vereinigte Arabische Emirate", power: 0.4, corners: 0.35, brakes: 0.25, laps: 59, kind: "night", lengthKm: 5.3, cornerCount: 15, tyreWear: 6, overtaking: 6, rainChance: 0.03 },
  { id: "bluffs", name: "Iron Bluffs", country: "Norwegen", power: 0.3, corners: 0.45, brakes: 0.25, laps: 68, kind: "mountain", lengthKm: 4.7, cornerCount: 17, tyreWear: 6, overtaking: 4, rainChance: 0.5 },
  { id: "velodrome", name: "Grand Velodrome", country: "Frankreich", power: 0.5, corners: 0.25, brakes: 0.25, laps: 52, kind: "speed", lengthKm: 6.4, cornerCount: 10, tyreWear: 7, overtaking: 8, rainChance: 0.25 },
];

export const TRACK_KIND_LABELS: Record<TrackKind, string> = {
  street: "Stadtkurs",
  desert: "Wüstenstrecke",
  mountain: "Bergstrecke",
  speed: "Highspeed",
  technical: "Technisch",
  night: "Nachtstrecke",
};

export const WEATHER_LABELS: Record<WeatherKind, { label: string; icon: string; grip: number; wear: number; desc: string }> = {
  sun: { label: "Sonne", icon: "☀", grip: 1, wear: 1, desc: "Ideale Bedingungen" },
  rain: { label: "Regen", icon: "🌧", grip: 0.86, wear: 0.85, desc: "Regenfähigkeit entscheidet" },
  storm: { label: "Sturm", icon: "⛈", grip: 0.78, wear: 0.9, desc: "Hohes Ausfallrisiko" },
  fog: { label: "Nebel", icon: "🌫", grip: 0.9, wear: 0.95, desc: "Weniger Überholmanöver" },
  heat: { label: "Hitze", icon: "🔥", grip: 0.95, wear: 1.25, desc: "Starker Reifenverschleiß" },
  night: { label: "Nacht", icon: "🌙", grip: 0.93, wear: 1.05, desc: "Konstanz zählt doppelt" },
};

export const AI_TEAM_DEFS = [
  { name: "Aurora Racing", color: "#e0332f" },
  { name: "Meridian GP", color: "#2f7de0" },
  { name: "Vulcan Motorsport", color: "#f0a020" },
  { name: "Nordstern Works", color: "#20c997" },
  { name: "Scuderia Lampo", color: "#c0392b" },
  { name: "Orbit Dynamics", color: "#8e5cf7" },
  { name: "Kestrel Sport", color: "#16a085" },
  { name: "Titan Grand Prix", color: "#95a5a6" },
  { name: "Phoenix Union", color: "#ff6b35" },
];

export const POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

export const DIFFICULTY: Record<
  Difficulty,
  { label: string; budget: number; aiStrength: number; costFactor: number }
> = {
  easy: { label: "Einfach", budget: 12_000_000, aiStrength: 0.88, costFactor: 0.8 },
  normal: { label: "Normal", budget: 8_000_000, aiStrength: 1, costFactor: 1 },
  hard: { label: "Schwer", budget: 5_000_000, aiStrength: 1.08, costFactor: 1.25 },
  pro: { label: "Profi", budget: 3_000_000, aiStrength: 1.16, costFactor: 1.5 },
};

export const TEAM_STYLES = [
  { id: "balanced", label: "Ausgeglichen", desc: "Keine Schwächen, keine Extreme" },
  { id: "engineering", label: "Ingenieurskunst", desc: "+Forschung, -Startbudget" },
  { id: "aggressive", label: "Angriffslustig", desc: "+Rennpace, -Zuverlässigkeit" },
  { id: "youth", label: "Jugendarbeit", desc: "Günstige Talente, +Training" },
] as const;

export const PART_LABELS: Record<PartKey, string> = {
  engine: "Motor",
  chassis: "Chassis",
  aero: "Aerodynamik",
  gearbox: "Getriebe",
  tyres: "Reifen",
  brakes: "Bremssystem",
  frontWing: "Frontflügel",
  rearWing: "Heckflügel",
  floor: "Unterboden",
  battery: "Batterie",
  cooling: "Kühlsystem",
  suspension: "Aufhängung",
  electronics: "Elektronik",
};

export const RESEARCH_LABELS: Record<ResearchKey, { label: string; effect: string }> = {
  engineDev: { label: "Motorentwicklung", effect: "Geschwindigkeit & Beschleunigung" },
  aeroDev: { label: "Aerodynamik", effect: "Kurven & Stabilität" },
  tyreDev: { label: "Reifenforschung", effect: "Reifenverschleiß" },
  reliabilityDev: { label: "Zuverlässigkeit", effect: "Defektwahrscheinlichkeit" },
  strategyDev: { label: "Strategie", effect: "Rennentscheidungen" },
};

export const BUILDING_LABELS: Record<BuildingKey, { label: string; effect: string; academy?: boolean }> = {
  garage: { label: "Garage", effect: "Fahrzeugwartung" },
  lab: { label: "Forschungslabor", effect: "Entwicklungsgeschwindigkeit" },
  simulator: { label: "Simulator", effect: "Fahrertraining" },
  workshop: { label: "Werkstatt", effect: "Zuverlässigkeit" },
  windTunnel: { label: "Windkanal", effect: "Aero-Entwicklung & Testdaten" },
  kartSchool: { label: "Kartschule", effect: "Entdeckt junge Talente", academy: true },
  juniorTeam: { label: "Junior-Team", effect: "Nachwuchsrennen & Erfahrung", academy: true },
  talentCenter: { label: "Talentzentrum", effect: "Bessere Talent-Scouting-Qualität", academy: true },
  youthSimulator: { label: "Nachwuchs-Simulator", effect: "Schnellere Ausbildung", academy: true },
};

export const STAFF_LABELS: Record<StaffRole, { label: string; effect: string }> = {
  engineer: { label: "Ingenieur", effect: "Fahrzeugentwicklung, Forschung, Performance" },
  mechanic: { label: "Mechaniker", effect: "Boxenstopps, Reparaturen, Zuverlässigkeit" },
  strategist: { label: "Strateg", effect: "Rennstrategie, Wetter, Reifenplanung" },
  designer: { label: "Designer", effect: "Entwicklung & Fahrzeugdesign" },
};

export const SPONSOR_NAMES = [
  "Volt Energy","Kite Airlines","Nimbus Tech","Ferrox Steel","Aeon Bank","Trailblaze Tools",
  "Hydra Fuels","Zenko Electronics","Northline Logistics","Cobalt Watches",
];

/* ---------- Design-Editor ---------- */
export const LIVERY_PATTERNS = ["Vollton", "Streifen", "Pfeil", "Flammen", "Carbon", "Wellen", "Sterne", "Splitter"];
export const SPONSOR_PLACEMENTS = ["Heckflügel", "Seitenkasten", "Motorhaube", "Frontflügel", "Verteilt"];
export const GARAGE_STYLES = ["Industrie", "Hightech", "Klassisch", "Neon", "Minimal"];
export const HQ_STYLES = ["Werkscampus", "Stadtvilla", "Bergbasis", "Hafenhalle"];
export const UI_THEMES = ["Racing Red", "Midnight Blue", "Carbon Gold", "Neon Grid"];
export const HELMET_PATTERNS = ["Einfarbig", "Blitz", "Krone", "Streifen", "Sterne", "Tarnung"];
export const DESIGN_COLORS = [
  "#e0332f","#2f7de0","#f0a020","#20c997","#8e5cf7","#ff6b35","#16a085","#e91e63","#f5f5f5","#1f2933",
];

/* ---------- Premium ---------- */
export interface PremiumItem {
  id: string;
  name: string;
  kind: "livery" | "helmet" | "garage" | "animation" | "theme" | "comfort";
  price: number;
  desc: string;
}

export const PREMIUM_ITEMS: PremiumItem[] = [
  { id: "liv_gold", name: "Goldstaub-Lackierung", kind: "livery", price: 400, desc: "Exklusive Lackierung mit Metallic-Effekt" },
  { id: "liv_aurora", name: "Aurora-Lackierung", kind: "livery", price: 350, desc: "Farbverlauf in Polarlicht-Tönen" },
  { id: "hel_legend", name: "Legenden-Helm", kind: "helmet", price: 250, desc: "Helmdesign der Motorsport-Legenden" },
  { id: "gar_neon", name: "Neon-Garage", kind: "garage", price: 300, desc: "Garagenkulisse mit Neonbeleuchtung" },
  { id: "ani_pitstop", name: "Boxenstopp-Animation", kind: "animation", price: 200, desc: "Erweiterte Rennanimationen" },
  { id: "the_carbon", name: "UI-Theme Carbon Gold", kind: "theme", price: 220, desc: "Alternatives Oberflächen-Theme" },
  { id: "cmf_slots", name: "+4 Speicherplätze", kind: "comfort", price: 300, desc: "Mehr Speicherplätze für Karrieren" },
  { id: "cmf_stats", name: "Erweiterte Statistiken", kind: "comfort", price: 260, desc: "Detailauswertungen & Verlaufsgrafiken" },
];

/* ---------- Meisterschafts-Vorlagen ---------- */
export const CHAMPIONSHIP_TEMPLATES: Pick<Championship, "kind" | "name" | "raceCount" | "budgetLimit" | "carRules" | "rules">[] = [
  { kind: "formula", name: "Formel-Serie", raceCount: 18, budgetLimit: 60_000_000, carRules: "Offene Prototypen", rules: ["Punkte für Top 10", "Bonuspunkt für schnellste Runde"] },
  { kind: "gt", name: "GT-Serie", raceCount: 12, budgetLimit: 25_000_000, carRules: "Seriennahe GT-Fahrzeuge", rules: ["Balance of Performance", "Zwei Fahrer pro Auto"] },
  { kind: "junior", name: "Nachwuchsserie", raceCount: 10, budgetLimit: 6_000_000, carRules: "Einheitsfahrzeug", rules: ["Nur Fahrer bis 21 Jahre", "Budgetdeckel streng"] },
  { kind: "endurance", name: "Langstreckenserie", raceCount: 8, budgetLimit: 40_000_000, carRules: "Langstreckenprototypen", rules: ["Rennen über 6 Stunden", "Pflicht-Fahrerwechsel"] },
];

export const EVENT_TEMPLATES: { kind: "winter" | "summer" | "special" | "historic" | "community"; name: string; desc: string }[] = [
  { kind: "winter", name: "Winter-Cup", desc: "Kaltes Wetter, geringer Grip, hohe Prämien" },
  { kind: "summer", name: "Sommer-Meisterschaft", desc: "Hitzerennen mit starkem Reifenverschleiß" },
  { kind: "special", name: "Spezialrennen", desc: "Einladungsrennen der Topteams" },
  { kind: "historic", name: "Historische Herausforderung", desc: "Klassische Fahrzeuge, feste Setups" },
  { kind: "community", name: "Community-Event", desc: "Wettbewerb der Fangemeinde mit Fan-Bonus" },
];
