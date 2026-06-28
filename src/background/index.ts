import { submitScan } from '../api/client';
import { getValidAccessToken } from '../lib/auth';
import type { ScanResult } from '../lib/messages';
import { jobFromSubmit, saveJob } from '../lib/scanJob';

// The SoundCloud button posts a SCAN message here. We submit the scan and write
// the active job to storage; the popup resumes that job (live progress +
// tracklist) the moment it opens. No polling here on purpose — MV3 service
// workers get killed when idle, so the popup owns the polling loop.

async function handleScan(url: string): Promise<ScanResult> {
  const token = await getValidAccessToken();
  if (!token) return { ok: false, reason: 'unauthenticated' };

  try {
    const data = await submitScan(url);
    const job = jobFromSubmit(data, url);
    await saveJob(job);
    return { ok: true, id: job.id, phase: job.phase };
  } catch (caught) {
    return {
      ok: false,
      reason: 'error',
      message: caught instanceof Error ? caught.message : 'Scan failed to start.',
    };
  }
}

function isScanMessage(value: unknown): value is { type: 'SCAN'; url: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { type?: unknown }).type === 'SCAN' &&
    typeof (value as { url?: unknown }).url === 'string'
  );
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (isScanMessage(message)) {
    void handleScan(message.url).then(sendResponse);
    return true; // keep the channel open for the async response
  }
  return undefined;
});
