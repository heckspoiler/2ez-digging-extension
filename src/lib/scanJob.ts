import type { ScanPhase, ScanSubmitResponse, SetMix, Track } from '../types';

// The single source of truth for an in-flight/finished scan. Persisted to
// chrome.storage.local so both the popup (useScanner) and the background worker
// (triggered from the SoundCloud button) read and write the same record.

export const SCAN_JOB_KEY = 'active_scan';
export const SCAN_FAILED_MESSAGE = 'Scan failed. Please try another SoundCloud URL.';

const COMPLETE_STATUSES = new Set(['complete', 'completed', 'done']);
const FAILED_STATUSES = new Set(['failed', 'error']);

export type ScanJob = {
  id: number;
  url: string;
  status: string | null;
  set: SetMix | null;
  tracks: Track[];
  phase: ScanPhase;
  error: string | null;
};

export function phaseForStatus(status: string | null | undefined): ScanPhase {
  const normalized = status?.toLowerCase();
  if (normalized && FAILED_STATUSES.has(normalized)) return 'error';
  if (normalized && COMPLETE_STATUSES.has(normalized)) return 'complete';
  return 'polling';
}

export function toSetMix(data: SetMix): SetMix {
  return {
    id: data.id,
    url: data.url,
    title: data.title,
    artist: data.artist,
    image_url: data.image_url,
    created_at: data.created_at,
  };
}

export function mergeTracks(current: Track[], next: Track[]): Track[] {
  const existing = new Set(current.map((t) => t.id));
  const fresh = next.filter((t) => !existing.has(t.id));
  return fresh.length > 0 ? [...current, ...fresh] : current;
}

/** Build a job from a POST /scan response. */
export function jobFromSubmit(data: ScanSubmitResponse, url: string): ScanJob {
  const phase = phaseForStatus(data.status);
  return {
    id: data.id,
    url,
    status: data.status,
    set: data.set ? toSetMix(data.set) : null,
    // Cached completes return tracks nested under `set`.
    tracks: data.tracks ?? data.set?.tracks ?? [],
    phase,
    error: phase === 'error' ? SCAN_FAILED_MESSAGE : null,
  };
}

export async function saveJob(job: ScanJob | null): Promise<void> {
  if (job) await chrome.storage.local.set({ [SCAN_JOB_KEY]: job });
  else await chrome.storage.local.remove(SCAN_JOB_KEY);
}

export async function loadJob(): Promise<ScanJob | null> {
  const result = await chrome.storage.local.get(SCAN_JOB_KEY);
  return (result[SCAN_JOB_KEY] as ScanJob | undefined) ?? null;
}
