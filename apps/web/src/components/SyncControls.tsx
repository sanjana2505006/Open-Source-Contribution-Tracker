import { useCallback, useEffect, useState } from 'react';
import type { SyncStatus } from '@osct/shared';
import { cancelSync, fetchSyncStatus, startSync } from '../lib/api';

type SyncControlsProps = {
  onComplete: () => void;
};

const STALE_MS = 60_000;

function jobAgeMs(job: SyncStatus | null): number {
  if (!job?.startedAt) return Infinity;
  return Date.now() - new Date(job.startedAt).getTime();
}

export function SyncControls({ onComplete }: SyncControlsProps) {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [sessionSync, setSessionSync] = useState(false);

  const poll = useCallback(async () => {
    const job = await fetchSyncStatus();
    setStatus(job);
    return job;
  }, []);

  useEffect(() => {
    poll()
      .then(async (job) => {
        if (job?.status === 'running' && jobAgeMs(job) > STALE_MS) {
          await cancelSync();
          await poll();
        }
      })
      .catch(() => {});
  }, [poll]);

  useEffect(() => {
    if (!sessionSync || status?.status !== 'running') return;

    const id = window.setInterval(() => {
      poll()
        .then((job) => {
          if (job && job.status !== 'running') {
            setSessionSync(false);
            onComplete();
          }
        })
        .catch(() => {});
    }, 2000);

    return () => window.clearInterval(id);
  }, [sessionSync, status?.status, poll, onComplete]);

  async function handleSync() {
    setSessionSync(true);
    setBusy(true);
    try {
      const job = await startSync();
      setStatus(job);
      if (job.status !== 'running') {
        setSessionSync(false);
        onComplete();
      }
    } catch {
      setSessionSync(false);
    } finally {
      setBusy(false);
    }
  }

  const ageMs = jobAgeMs(status);
  const serverRunning = status?.status === 'running';
  const stale = serverRunning && ageMs > STALE_MS;
  const showSpinner =
    sessionSync && (busy || (serverRunning && !stale));
  const running = showSpinner;

  return (
    <div className="flex min-w-[200px] flex-col items-end gap-2">
      <button
        type="button"
        onClick={handleSync}
        disabled={running}
        className="btn btn-primary"
      >
        {running && (
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 16 16" fill="none" aria-hidden>
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeDasharray="20 10" />
          </svg>
        )}
        {running ? 'Syncing…' : 'Sync from GitHub'}
      </button>

      {running && status && (
        <div className="w-full max-w-[220px]">
          <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-border)]">
            <div
              className="h-full rounded-full bg-[var(--color-accent)] transition-all duration-500"
              style={{ width: `${Math.min(95, 15 + status.reposSynced * 2)}%` }}
            />
          </div>
          <p className="mt-1.5 text-right text-[10px] font-medium text-[var(--color-muted)]">
            {status.reposSynced > 0 ? `${status.reposSynced} items processed` : 'fetching from GitHub…'}
          </p>
        </div>
      )}

      {!running && status?.status === 'completed' && (
        <p className="text-[10px] font-medium text-[var(--color-ok)]">last sync ok</p>
      )}

      {!running &&
        status?.status === 'partial' &&
        status.errorMessage?.startsWith('Synced ') && (
          <p className="max-w-[240px] text-right text-[10px] font-medium leading-snug text-[var(--color-ok)]">
            {status.errorMessage}
          </p>
        )}

      {!running &&
        status?.status === 'partial' &&
        status.errorMessage &&
        !status.errorMessage.startsWith('Synced ') && (
        <p className="max-w-[240px] text-right text-[10px] font-medium leading-snug text-[var(--color-warn)]">
          {status.errorMessage}
        </p>
      )}

      {!running && status?.status === 'failed' && status.errorMessage && (
        <p className="max-w-[240px] text-right text-[10px] font-medium leading-snug text-[var(--color-bad)]">
          {status.errorMessage}
        </p>
      )}
    </div>
  );
}
