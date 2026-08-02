// Speichersystem: LocalStorage-Adapter mit Slot-Verwaltung + Schema-Migration.
import { ensureExpansion } from "./migrate";
import type { GameState } from "./types";
import { SAVE_VERSION } from "./version";

export { SAVE_VERSION };
const PREFIX = "legends-grid/save/";
const INDEX_KEY = "legends-grid/index";
export const AUTO_SLOT = 0;
export const SLOT_COUNT = 8;

export interface SaveMeta {
  slot: number;
  teamName: string;
  year: number;
  round: number;
  money: number;
  updatedAt: number;
  auto: boolean;
}

interface StorageAdapter {
  read(key: string): string | null;
  write(key: string, value: string): void;
  remove(key: string): void;
}

const local: StorageAdapter = {
  read: (k) => (typeof window === "undefined" ? null : window.localStorage.getItem(k)),
  write: (k, v) => {
    if (typeof window !== "undefined") window.localStorage.setItem(k, v);
  },
  remove: (k) => {
    if (typeof window !== "undefined") window.localStorage.removeItem(k);
  },
};

let adapter: StorageAdapter = local;
export function setStorageAdapter(next: StorageAdapter) {
  adapter = next;
}

function readIndex(): SaveMeta[] {
  try {
    const raw = adapter.read(INDEX_KEY);
    return raw ? (JSON.parse(raw) as SaveMeta[]) : [];
  } catch {
    return [];
  }
}

function writeIndex(list: SaveMeta[]) {
  adapter.write(INDEX_KEY, JSON.stringify(list));
}

export function listSaves(): SaveMeta[] {
  return readIndex().sort((a, b) => a.slot - b.slot);
}

export function saveGame(state: GameState, slot: number): SaveMeta {
  const payload: GameState = { ...state, version: SAVE_VERSION, updatedAt: Date.now() };
  adapter.write(PREFIX + slot, JSON.stringify(payload));
  const meta: SaveMeta = {
    slot,
    teamName: state.team.name,
    year: state.season.year,
    round: state.season.round,
    money: state.team.money,
    updatedAt: payload.updatedAt,
    auto: slot === AUTO_SLOT,
  };
  writeIndex([...readIndex().filter((m) => m.slot !== slot), meta]);
  return meta;
}

export function loadGame(slot: number): GameState | null {
  try {
    const raw = adapter.read(PREFIX + slot);
    if (!raw) return null;
    return migrate(JSON.parse(raw) as GameState);
  } catch {
    return null;
  }
}

export function deleteSave(slot: number) {
  adapter.remove(PREFIX + slot);
  writeIndex(readIndex().filter((m) => m.slot !== slot));
}

/** Schema-Migration: alte Bauphase-1-Spielstände werden mit Bauphase-2-Daten aufgefüllt. */
function migrate(state: GameState): GameState {
  const next = ensureExpansion(state);
  next.version = SAVE_VERSION;
  return next;
}
