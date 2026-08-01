// Reine Datentypen des Spiels – frameworkfrei, erweiterbar für Bauphase 2.

export type Difficulty = "easy" | "normal" | "hard" | "pro";
export type Strategy = "aggressive" | "normal" | "safe";

export interface DriverSkills {
  speed: number;
  cornering: number;
  braking: number;
  overtaking: number;
  defending: number;
  wet: number;
  consistency: number;
  raceIQ: number;
  experience: number;
  talent: number;
}

export interface Driver {
  id: string;
  name: string;
  age: number;
  nationality: string;
  portrait: string; // Initialen-Avatar (Bild-Slot, später echte Bilder)
  salary: number;
  marketValue: number;
  skills: DriverSkills;
  teamId: string | null;
  contractSeasons: number;
  stats: DriverStats;
}

export interface DriverStats {
  starts: number;
  wins: number;
  podiums: number;
  poles: number;
  points: number;
  championships: number;
}

export type PartKey =
  | "engine"
  | "chassis"
  | "aero"
  | "gearbox"
  | "tyres"
  | "brakes";

export interface CarPart {
  level: number;
  performance: number;
  reliability: number;
}

export interface Car {
  name: string;
  parts: Record<PartKey, CarPart>;
}

export type ResearchKey =
  | "engineDev"
  | "aeroDev"
  | "tyreDev"
  | "reliabilityDev"
  | "strategyDev";

export interface ResearchProject {
  level: number;
  progress: number; // 0..100
  active: boolean;
}

export type BuildingKey = "garage" | "lab" | "simulator" | "workshop";

export interface Building {
  level: number;
}

export interface Sponsor {
  id: string;
  name: string;
  perRace: number;
  signingBonus: number;
  seasons: number;
  requirement: SponsorRequirement;
  reward: number;
}

export interface SponsorRequirement {
  type: "top10" | "win" | "points";
  value: number;
  label: string;
}

export interface RaceResultRow {
  driverId: string;
  driverName: string;
  teamId: string;
  teamName: string;
  teamColor: string;
  grid: number;
  position: number | null; // null = DNF
  points: number;
  dnf: boolean;
  fastestLap: boolean;
}

export interface RaceRecord {
  round: number;
  trackId: string;
  trackName: string;
  results: RaceResultRow[];
}

export interface AiTeam {
  id: string;
  name: string;
  color: string;
  strength: number; // 0..100
  driverIds: string[];
}

export interface Team {
  name: string;
  logo: string;
  color: string;
  country: string;
  style: "balanced" | "engineering" | "aggressive" | "youth";
  reputation: number;
  money: number;
  car: Car;
  research: Record<ResearchKey, ResearchProject>;
  buildings: Record<BuildingKey, Building>;
  driverIds: string[]; // Kaderfahrer
  lineup: [string | null, string | null]; // Renneinsatz
  sponsorIds: string[];
  stats: {
    wins: number;
    podiums: number;
    poles: number;
    points: number;
    championships: number;
    seasonsPlayed: number;
  };
  history: string[];
}

export interface SeasonState {
  year: number;
  round: number; // 0-basiert, nächstes Rennen
  calendar: string[]; // Track-Ids
  standings: Record<string, number>; // driverId -> Punkte
  teamStandings: Record<string, number>;
  races: RaceRecord[];
  trainingDone: boolean;
  qualiDone: boolean;
  lastQualifying: { driverId: string; position: number }[] | null;
}

export interface GameState {
  version: number;
  createdAt: number;
  updatedAt: number;
  difficulty: Difficulty;
  team: Team;
  aiTeams: AiTeam[];
  drivers: Record<string, Driver>;
  freeAgents: string[];
  season: SeasonState;
  availableSponsors: Sponsor[];
  aiStrengthModifier: number;
}
