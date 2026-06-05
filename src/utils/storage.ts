import type { AppState } from '../types';

const STORAGE_KEY = 'workstream-tracker-state';
const MD_PATH_KEY = 'workstream-tracker-md-path';

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Failed to save state to localStorage', e);
  }
}

export function loadState(): AppState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AppState;
  } catch (e) {
    console.warn('Failed to load state from localStorage', e);
    return null;
  }
}

export function saveMdPath(filePath: string): void {
  try {
    localStorage.setItem(MD_PATH_KEY, filePath);
  } catch (e) {
    console.warn('Failed to save markdown path', e);
  }
}

export function loadMdPath(): string | null {
  try {
    return localStorage.getItem(MD_PATH_KEY);
  } catch {
    return null;
  }
}
