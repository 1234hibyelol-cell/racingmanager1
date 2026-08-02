// Reine Datentypen des Spiels – frameworkfrei.
// Bauphase 2: Fahrerkarriere, Personal, Akademie, Wetter, Meisterschaften, Welt, Medien, Wirtschaft, Events, Premium.

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

/** Bauphase 2: Persönlichkeit & mentale Werte. */
export interface DriverTraits {
  personality: string;
  motivation: number;
  confidence: number;
  pressure: number; // Druckresistenz
  popularity: number; // Fanbeliebtheit
  loyalty: number; // Teamtreue
  aggression: number;
  mediaSkill: number; // Medienverhalten
}

export type DriverStage = "prospect" | "rising" | "prime" | "veteran" | "declining" | "retired";

export interface DriverGear {
  helmet: string;
  helmetPattern: string;
  suit: string;
  gloves: string;
}

export interface Driver {
  id: string;
  name: string;
  age: number;
  nationality: string;
  portrait: string;
  salary: number;
  marketValue: number;
  skills: DriverSkills;
  teamId: string | null;
  contractSeasons: number;
  stats: DriverStats;
  /* Bauphase 2 */
  traits: DriverTraits;
  stage: DriverStage;
  peakAge: number;
  form: number; // 0..100 Tagesform
  rivalIds: string[];
  friendIds: string[];
  retired: boolean;
  legend: boolean;
  academy: boolean;
  gear: DriverGear;
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
  | "brakes"
  | "frontWing"
  | "rearWing"
  | "floor"
  | "battery"
  | "cooling"
  | "suspension"
  | "electronics";

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

export type BuildingKey =
  | "garage"
  | "lab"
  | "simulator"
  | "workshop"
  | "windTunnel"
  | "kartSchool"
  | "juniorTeam"
  | "talentCenter"
  | "youthSimulator";

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

/* ---------- Personal ---------- */
export type StaffRole = "engineer" | "mechanic" | "strategist" | "designer";

export interface Staff {
  id: string;
  name: string;
  age: number;
  role: StaffRole;
  experience: number; // 0..100
  skill: number; // 0..100
  salary: number;
  personality: string;
  teamId: string | null;
}

/* ---------- Fahrzeugentwicklung ---------- */
export interface DevelopmentFlaw {
  id: string;
  part: PartKey;
  label: string;
  penalty: number;
}

export interface Prototype {
  id: string;
  part: PartKey;
  quality: number; // 0..100
  tested: boolean;
}

export interface DevelopmentState {
  windTunnelData: number; // 0..100
  simulationData: number; // 0..100
  testKm: number;
  prototypes: Prototype[];
  flaws: DevelopmentFlaw[];
  setup: number; // 0..100 Wochenend-Setup
}

/* ---------- Design ---------- */
export interface TeamDesign {
  primary: string;
  secondary: string;
  pattern: string;
  logo: string;
  sponsorPlacement: string;
  raceNumber: number;
  garage: string;
  headquarters: string;
  uiTheme: string;
}

/* ---------- Wirtschaft ---------- */
export interface FinanceState {
  tvDeal: number;
  merchLevel: number;
  ticketLevel: number;
  investors: number;
  marketing: number;
  factory: number;
  travelCost: number;
  lastReport: FinanceReport | null;
}

export interface FinanceReport {
  round: number;
  sponsors: number;
  prize: number;
  tv: number;
  merch: number;
  tickets: number;
  investors: number;
  salaries: number;
  staff: number;
  facilities: number;
  marketing: number;
  travel: number;
  net: number;
}

/* ---------- Wetter & Strecken ---------- */
export type WeatherKind = "sun" | "rain" | "storm" | "fog" | "heat" | "night";

export interface WeatherState {
  kind: WeatherKind;
  temperature: number;
  gripFactor: number;
  forecast: WeatherKind[];
  locked: boolean; // Admin-Override
}

export type TrackKind = "street" | "desert" | "mountain" | "speed" | "technical" | "night";

/* ---------- Rennen ---------- */
export interface RaceResultRow {
  driverId: string;
  driverName: string;
  teamId: string;
  teamName: string;
  teamColor: string;
  grid: number;
  position: number | null;
  points: number;
  dnf: boolean;
  fastestLap: boolean;
  incidents?: string[];
  penaltySeconds?: number;
}

export interface RaceRecord {
  round: number;
  trackId: string;
  trackName: string;
  results: RaceResultRow[];
  weather?: WeatherKind;
  championshipId?: string | null;
}

export interface AiTeam {
  id: string;
  name: string;
  color: string;
  strength: number;
  driverIds: string[];
  development?: number;
}

/* ---------- Meisterschaften ---------- */
export interface Championship {
  id: string;
  name: string;
  logo: string;
  kind: "formula" | "gt" | "junior" | "endurance";
  teamCount: number;
  driversPerTeam: number;
  raceCount: number;
  calendar: string[];
  points: number[];
  budgetLimit: number;
  carRules: string;
  rules: string[];
  custom: boolean;
}

/* ---------- Medien ---------- */
export interface MediaOption {
  id: string;
  label: string;
  reputation: number;
  morale: number;
  sponsorBonus: number;
  fan: number;
}

export interface MediaEvent {
  id: string;
  kind: "press" | "interview" | "social";
  headline: string;
  question: string;
  driverId: string | null;
  options: MediaOption[];
}

export interface MediaPost {
  id: string;
  author: string;
  text: string;
  tone: "positive" | "neutral" | "negative";
  createdRound: number;
}

export interface MediaState {
  pending: MediaEvent[];
  feed: MediaPost[];
  fanbase: number;
}

/* ---------- Welt / Historie ---------- */
export interface NewsItem {
  id: string;
  year: number;
  round: number;
  text: string;
  tag: "transfer" | "development" | "sponsor" | "talent" | "record" | "legend" | "event";
}

export interface SeasonArchive {
  year: number;
  championDriver: string;
  championTeam: string;
  playerPoints: number;
  playerPosition: number;
}

export interface WorldRecords {
  mostWins: { name: string; value: number };
  mostTitles: { name: string; value: number };
  mostPoints: { name: string; value: number };
  bestTeam: { name: string; value: number };
}

export interface WorldState {
  news: NewsItem[];
  archive: SeasonArchive[];
  records: WorldRecords;
  legends: string[];
  generation: number;
}

/* ---------- Events ---------- */
export interface SeasonEvent {
  id: string;
  name: string;
  kind: "winter" | "summer" | "special" | "historic" | "community";
  trackId: string;
  entryFee: number;
  reward: number;
  reputation: number;
  done: boolean;
  description: string;
}

/* ---------- Online-Vorbereitung ---------- */
export interface PlayerProfile {
  id: string;
  name: string;
  level: number;
  xp: number;
  rating: number; // Ranglisten-Elo
  friends: { id: string; name: string; rating: number }[];
  clubs: { id: string; name: string; members: number }[];
  achievements: string[];
}

/* ---------- Premium ---------- */
export interface PremiumState {
  credits: number;
  owned: string[];
  saveSlots: number;
  advancedStats: boolean;
  theme: string;
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
  driverIds: string[];
  lineup: [string | null, string | null];
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
  /* Bauphase 2 */
  staffIds: string[];
  academyIds: string[];
  development: DevelopmentState;
  design: TeamDesign;
  finance: FinanceState;
  legacyPoints: number;
}

export interface SeasonState {
  year: number;
  round: number;
  calendar: string[];
  standings: Record<string, number>;
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
  staff: Record<string, Staff>;
  freeAgents: string[];
  staffMarket: string[];
  youthProspects: string[];
  season: SeasonState;
  availableSponsors: Sponsor[];
  aiStrengthModifier: number;
  weather: WeatherState;
  championships: Championship[];
  activeChampionshipId: string | null;
  events: SeasonEvent[];
  media: MediaState;
  world: WorldState;
  profile: PlayerProfile;
  premium: PremiumState;
  customTracks: CustomTrack[];
}

export interface CustomTrack {
  id: string;
  name: string;
  country: string;
  kind: TrackKind;
  lengthKm: number;
  cornerCount: number;
  tyreWear: number;
  overtaking: number;
  rainChance: number;
  power: number;
  corners: number;
  brakes: number;
  laps: number;
}
