// Statische Spieldaten: Namen, Länder, Strecken, Sponsoren, Balancing.
import type { BuildingKey, Difficulty, PartKey, ResearchKey } from "./types";

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

export interface TrackDef {
  id: string;
  name: string;
  country: string;
  power: number; // Gewichtung Motor/Speed
  corners: number; // Gewichtung Kurven/Aero
  brakes: number;
  laps: number;
}

export const TRACKS: TrackDef[] = [
  { id: "monza", name: "Autodromo Reale", country: "Italien", power: 0.5, corners: 0.2, brakes: 0.3, laps: 53 },
  { id: "alpen", name: "Alpenring", country: "Österreich", power: 0.4, corners: 0.35, brakes: 0.25, laps: 71 },
  { id: "harbor", name: "Harbour Street", country: "Monaco", power: 0.15, corners: 0.55, brakes: 0.3, laps: 78 },
  { id: "dunes", name: "Dünen-Kurs", country: "Niederlande", power: 0.3, corners: 0.45, brakes: 0.25, laps: 72 },
  { id: "sakura", name: "Sakura Circuit", country: "Japan", power: 0.3, corners: 0.45, brakes: 0.25, laps: 53 },
  { id: "estoril", name: "Costa Verde", country: "Portugal", power: 0.35, corners: 0.4, brakes: 0.25, laps: 66 },
  { id: "desert", name: "Desert Bowl", country: "Katar", power: 0.4, corners: 0.35, brakes: 0.25, laps: 57 },
  { id: "lakeside", name: "Lakeside Park", country: "Kanada", power: 0.45, corners: 0.25, brakes: 0.3, laps: 70 },
  { id: "highveld", name: "Highveld Speedway", country: "Südafrika", power: 0.45, corners: 0.3, brakes: 0.25, laps: 60 },
  { id: "pampas", name: "Pampas International", country: "Argentinien", power: 0.35, corners: 0.4, brakes: 0.25, laps: 63 },
  { id: "nordwald", name: "Nordwald Arena", country: "Deutschland", power: 0.4, corners: 0.35, brakes: 0.25, laps: 67 },
  { id: "sunset", name: "Sunset Bay", country: "Australien", power: 0.35, corners: 0.35, brakes: 0.3, laps: 58 },
];

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
  brakes: "Bremsen",
};

export const RESEARCH_LABELS: Record<ResearchKey, { label: string; effect: string }> = {
  engineDev: { label: "Motorentwicklung", effect: "Geschwindigkeit & Beschleunigung" },
  aeroDev: { label: "Aerodynamik", effect: "Kurven & Stabilität" },
  tyreDev: { label: "Reifenforschung", effect: "Reifenverschleiß" },
  reliabilityDev: { label: "Zuverlässigkeit", effect: "Defektwahrscheinlichkeit" },
  strategyDev: { label: "Strategie", effect: "Rennentscheidungen" },
};

export const BUILDING_LABELS: Record<BuildingKey, { label: string; effect: string }> = {
  garage: { label: "Garage", effect: "Fahrzeugwartung" },
  lab: { label: "Forschungslabor", effect: "Entwicklungsgeschwindigkeit" },
  simulator: { label: "Simulator", effect: "Fahrertraining" },
  workshop: { label: "Werkstatt", effect: "Zuverlässigkeit" },
};

export const SPONSOR_NAMES = [
  "Volt Energy","Kite Airlines","Nimbus Tech","Ferrox Steel","Aeon Bank","Trailblaze Tools",
  "Hydra Fuels","Zenko Electronics","Northline Logistics","Cobalt Watches",
];
