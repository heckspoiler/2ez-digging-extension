// Messages exchanged between the content script and the background worker.

export type ScanMessage = { type: 'SCAN'; url: string };

export type ScanResult =
  | { ok: true; id: number; phase: string }
  | { ok: false; reason: 'unauthenticated' | 'error'; message?: string };
