import { useCallback, useEffect, useRef, useState } from 'react';

import { getSetTracks, submitScan } from '../api/client';
import {
  jobFromSubmit,
  loadJob,
  mergeTracks,
  phaseForStatus,
  saveJob,
  SCAN_FAILED_MESSAGE,
  toSetMix,
  type ScanJob,
} from '../lib/scanJob';
import type { ScanPhase, SetMix, Track } from '../types';

// Submit, then poll the set until it's done, merging in tracks as the backend
// identifies them. The job is persisted (see scanJob.ts) so closing the popup
// never loses the scan — on reopen we resume polling, or show the finished
// tracklist if the backend completed while we were gone. A scan can also be
// started from the SoundCloud button (background worker), and we pick it up
// here the same way.
const POLL_INTERVAL_MS = 3000;

export function useScanner() {
  const [url, setUrl] = useState('');
  const [phase, setPhase] = useState<ScanPhase>('idle');
  const [set, setSet] = useState<SetMix | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const jobRef = useRef<ScanJob | null>(null);

  const stopPolling = useCallback(() => {
    if (intervalRef.current !== null) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Write a job to storage + render state in one place so the two never drift.
  const commit = useCallback((job: ScanJob) => {
    jobRef.current = job;
    setPhase(job.phase);
    setSet(job.set);
    setTracks(job.tracks);
    setStatus(job.status);
    setError(job.error);
    void saveJob(job);
  }, []);

  const poll = useCallback(
    async (scanId: number) => {
      try {
        const data = await getSetTracks(scanId);
        const prev = jobRef.current;
        const nextPhase = phaseForStatus(data.status);
        commit({
          id: scanId,
          url: prev?.url ?? data.url,
          status: data.status ?? null,
          set: toSetMix(data),
          tracks: mergeTracks(prev?.tracks ?? [], data.tracks ?? []),
          phase: nextPhase,
          error: nextPhase === 'error' ? SCAN_FAILED_MESSAGE : null,
        });
        if (nextPhase !== 'polling') stopPolling();
      } catch (caught) {
        stopPolling();
        const prev = jobRef.current;
        commit({
          id: scanId,
          url: prev?.url ?? '',
          status: prev?.status ?? null,
          set: prev?.set ?? null,
          tracks: prev?.tracks ?? [],
          phase: 'error',
          error:
            caught instanceof Error
              ? caught.message
              : 'Something went wrong while fetching results.',
        });
      }
    },
    [commit, stopPolling],
  );

  const startPolling = useCallback(
    (scanId: number) => {
      stopPolling();
      void poll(scanId);
      intervalRef.current = setInterval(() => void poll(scanId), POLL_INTERVAL_MS);
    },
    [poll, stopPolling],
  );

  // On mount: resume an in-flight/finished scan, otherwise prefill from the tab.
  useEffect(() => {
    let mounted = true;

    void loadJob().then(async (job) => {
      if (!mounted) return;

      if (job && job.id > 0 && job.phase === 'polling') {
        setUrl(job.url);
        commit(job);
        startPolling(job.id);
        return;
      }

      if (job && (job.phase === 'complete' || job.phase === 'error')) {
        setUrl(job.url);
        commit(job);
        return;
      }

      // Nothing resumable — drop any stale job and prefill from a SoundCloud tab.
      if (job) await saveJob(null);
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (mounted && tab?.url && tab.url.includes('soundcloud.com')) {
        setUrl(tab.url);
      }
    });

    return () => {
      mounted = false;
      stopPolling();
    };
  }, [commit, startPolling, stopPolling]);

  const scan = useCallback(
    async (rawUrl: string) => {
      const trimmed = rawUrl.trim();
      if (!trimmed) {
        setPhase('error');
        setError('Please enter a SoundCloud URL.');
        return;
      }

      stopPolling();
      setUrl(trimmed);
      commit({
        id: -1,
        url: trimmed,
        status: null,
        set: null,
        tracks: [],
        phase: 'submitting',
        error: null,
      });

      try {
        const data = await submitScan(trimmed);
        const job = jobFromSubmit(data, trimmed);
        commit(job);
        if (job.phase === 'polling') startPolling(job.id);
      } catch (caught) {
        commit({
          id: -1,
          url: trimmed,
          status: null,
          set: null,
          tracks: [],
          phase: 'error',
          error:
            caught instanceof Error
              ? caught.message
              : 'Something went wrong while submitting the scan.',
        });
      }
    },
    [commit, startPolling, stopPolling],
  );

  const reset = useCallback(() => {
    stopPolling();
    jobRef.current = null;
    setPhase('idle');
    setSet(null);
    setTracks([]);
    setStatus(null);
    setError(null);
    void saveJob(null);
  }, [stopPolling]);

  return {
    url,
    setUrl,
    phase,
    set,
    tracks,
    status,
    error,
    scan,
    reset,
    isLoading: phase === 'submitting' || phase === 'polling',
    isComplete: phase === 'complete',
    hasTracks: tracks.length > 0,
  };
}
