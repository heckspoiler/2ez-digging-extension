import { getValidAccessToken } from '../lib/auth';
import { API_BASE_URL } from '../lib/config';
import type { ScanSubmitResponse, SetMix, SetTracksResponse } from '../types';

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getValidAccessToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

function asError(res: Response, action: string): Error {
  if (res.status === 401) {
    return new Error('Your session expired — please log in again.');
  }
  return new Error(`Failed to ${action} (${res.status}).`);
}

export async function submitScan(url: string): Promise<ScanSubmitResponse> {
  const res = await fetch(`${API_BASE_URL}/scan`, {
    method: 'POST',
    headers: await authHeaders(),
    body: JSON.stringify({ url }),
  });
  if (!res.ok) throw asError(res, 'submit scan');
  return (await res.json()) as ScanSubmitResponse;
}

export async function getSetTracks(setId: number): Promise<SetTracksResponse> {
  const res = await fetch(`${API_BASE_URL}/sets/${setId}`, {
    method: 'GET',
    headers: await authHeaders(),
  });
  if (!res.ok) throw asError(res, 'load tracklist');
  return (await res.json()) as SetTracksResponse;
}

export async function fetchSets(): Promise<SetMix[]> {
  const res = await fetch(`${API_BASE_URL}/sets`, {
    method: 'GET',
    headers: await authHeaders(),
  });
  if (!res.ok) throw asError(res, 'load your sets');
  return (await res.json()) as SetMix[];
}
