import type { QueuedObservation } from '../types/observation';

const STORAGE_KEY = 'frewa_offline_observations_v1';

export function loadOfflineQueue(): QueuedObservation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as QueuedObservation[]) : [];
  } catch {
    return [];
  }
}

export function saveOfflineQueue(queue: QueuedObservation[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch (err) {
    console.error('Failed to persist offline queue in localStorage:', err);
    throw new Error(
      'Local browser storage is full. Try submitting without a photo or clearing synced items.',
    );
  }
}

export function enqueueOfflineObservation(item: QueuedObservation): QueuedObservation[] {
  const current = loadOfflineQueue();
  const next = [item, ...current];
  saveOfflineQueue(next);
  return next;
}

export function removeOfflineObservation(localId: string): QueuedObservation[] {
  const current = loadOfflineQueue();
  const next = current.filter((item) => item.localId !== localId);
  saveOfflineQueue(next);
  return next;
}
