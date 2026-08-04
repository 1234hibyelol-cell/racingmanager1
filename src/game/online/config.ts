// Gemeinsame Online-Konfiguration (Team-HQ, Forschungsbaum, Sponsoren, Entwicklung).
export const HQ_KEYS = ["garage", "windTunnel", "simulator", "academy", "marketing"] as const;
export type HqKey = (typeof HQ_KEYS)[number];

export const HQ_LABELS: Record<HqKey, { label: string; desc: string }> = {
  garage: { label: "Garage", desc: "Boxenstopps und Zuverlässigkeit" },
  windTunnel: { label: "Windkanal", desc: "Aerodynamik-Fortschritt" },
  simulator: { label: "Simulator", desc: "Fahrer- und Setup-Training" },
  academy: { label: "Akademie", desc: "Nachwuchs und Personal" },
  marketing: { label: "Marketing", desc: "Sponsoreinnahmen" },
};

export const HQ_MAX = 8;
export const hqCost = (level: number) => 350_000 * level;

export const RESEARCH_BRANCHES = ["engine", "aero", "chassis", "tyres", "reliability"] as const;
export type ResearchBranch = (typeof RESEARCH_BRANCHES)[number];

export const BRANCH_LABELS: Record<ResearchBranch, string> = {
  engine: "Antrieb",
  aero: "Aerodynamik",
  chassis: "Chassis",
  tyres: "Reifen",
  reliability: "Zuverlässigkeit",
};

export interface ResearchNode {
  id: string;
  label: string;
  branch: ResearchBranch;
  tier: number;
  cost: number;
  gain: number;
  requires: string | null;
}

export const RESEARCH_NODES: ResearchNode[] = RESEARCH_BRANCHES.flatMap((branch) => {
  const names: Record<ResearchBranch, string[]> = {
    engine: ["Turbo-Mapping", "Hybrid-Boost", "Leichtbau-Block"],
    aero: ["Frontflügel-Kit", "Bodeneffekt", "Aktive Anströmung"],
    chassis: ["Steifer Rahmen", "Adaptives Fahrwerk", "Monocoque V2"],
    tyres: ["Temperaturfenster", "Langlauf-Mischung", "Regen-Compound"],
    reliability: ["Kühlkonzept", "Getriebe-Standfestigkeit", "Redundante Elektronik"],
  };
  return [1, 2, 3].map((tier) => ({
    id: `${branch}${tier}`,
    label: names[branch][tier - 1]!,
    branch,
    tier,
    cost: 400_000 * tier,
    gain: 8 + tier * 4,
    requires: tier === 1 ? null : `${branch}${tier - 1}`,
  }));
});

export interface OnlineSponsor {
  id: string;
  name: string;
  perRace: number;
  signing: number;
  minRating: number;
}

export const ONLINE_SPONSORS: OnlineSponsor[] = [
  { id: "voltek", name: "Voltek Energy", perRace: 90_000, signing: 250_000, minRating: 0 },
  { id: "nordfin", name: "Nordfin Bank", perRace: 140_000, signing: 400_000, minRating: 1010 },
  { id: "aeris", name: "Aeris Airways", perRace: 190_000, signing: 600_000, minRating: 1030 },
  { id: "titanoil", name: "Titan Oil", perRace: 260_000, signing: 900_000, minRating: 1060 },
];

export const TRAIN_DRIVER_COST = 180_000;
export const TRAIN_STAFF_COST = 140_000;
export const STAFF_ROLES = ["engineer", "mechanic", "strategist", "designer"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];
export const STAFF_LABELS: Record<StaffRole, string> = {
  engineer: "Ingenieur",
  mechanic: "Mechaniker",
  strategist: "Strateg",
  designer: "Designer",
};

export const SEASON_ROUNDS = 12;
export const LEAGUE_SIZE = 20;
export const RACE_MINUTES = 12;
export const POINTS_TABLE = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

export const ORDER_LABELS: Record<string, string> = {
  push: "Angriff",
  normal: "Normal",
  conserve: "Schonen",
  pit: "Boxenstopp",
};

export interface OnlineDriver {
  name: string;
  rating: number;
  form: number;
  wet: number;
}

export function teamStrength(team: {
  research?: Record<string, unknown> | null;
  staff?: Record<string, unknown> | null;
  hq?: Record<string, unknown> | null;
}): number {
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);
  const r = (team.research ?? {}) as Record<string, unknown>;
  const s = (team.staff ?? {}) as Record<string, unknown>;
  const h = (team.hq ?? {}) as Record<string, unknown>;
  const res = RESEARCH_BRANCHES.reduce((a, b) => a + num(r[b]), 0) / RESEARCH_BRANCHES.length;
  const staff = STAFF_ROLES.reduce((a, b) => a + num(s[b]), 0) / STAFF_ROLES.length;
  const hq = (HQ_KEYS.reduce((a, b) => a + num(h[b]), 0) / HQ_KEYS.length) * 9;
  return Math.round(40 + res * 0.4 + staff * 0.3 + hq * 0.25);
}

export function money(v: number): string {
  return `${Math.round(v).toLocaleString("de-DE")} €`;
}

export function formatGap(ms: number): string {
  if (ms <= 0) return "—";
  if (ms > 60_000) return `+${Math.floor(ms / 60_000)}:${String(Math.floor((ms % 60_000) / 1000)).padStart(2, "0")}`;
  return `+${(ms / 1000).toFixed(1)}s`;
}

export function formatLapTime(ms: number): string {
  if (!ms) return "—";
  const m = Math.floor(ms / 60_000);
  const s = (ms % 60_000) / 1000;
  return `${m}:${s.toFixed(3).padStart(6, "0")}`;
}
