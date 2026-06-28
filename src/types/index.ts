// Shapes mirror the backend responses in app/routes/scans.py.

export type Track = {
  id: string;
  title: string;
  artist: string;
  album: string | null;
  cover_url: string | null;
  shazam_url: string | null;
  offset_seconds: number;
};

export type SetMix = {
  id: number;
  url: string;
  title: string | null;
  artist: string | null;
  image_url: string | null;
  created_at: string;
};

export type ScanPhase = 'idle' | 'submitting' | 'polling' | 'complete' | 'error';

// POST /scan
export type ScanSubmitResponse = {
  id: number;
  status: string;
  cached: boolean;
  set?: (SetMix & { status?: string; tracks?: Track[] }) | null;
  tracks?: Track[];
};

// GET /sets/{id}
export type SetTracksResponse = SetMix & {
  status?: string;
  tracks: Track[];
};
