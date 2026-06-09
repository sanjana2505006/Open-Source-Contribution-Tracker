import { useCallback, useEffect, useState } from 'react';
import type { SyncStatus } from '@osct/shared';
import { fetchSyncStatus, startSync } from '../lib/api';

type SyncControlsProps = {
  onComplete: () => void;
};

export function SyncControls({ onComplete }: SyncControlsProps) {
  const [status, setStatus] = useState<SyncStatus | null>(null);
  const [busy, setBusy] = useState(false);

  const poll = useCallback(async () => {
    const job = await fetchSyncStatus();
    setStatus(job);
    return job;
  }, []);

  useEffect(() => {
    poll().catch(() => {});
  }, [poll]);

  useEffect(() => {
    if (status?.status !== 'running') return;

    const id = window.setInterval(() => {
      poll()
        .then((job) => {
          if (job && job.status !== 'running') onComplete();
        })
        .catch(() => {});
    }, 2000);

    return () => window.clearInterval(id);
  }, [status?.status, poll, onComplete]);

  async function handleSync() {
    setBusy(true);
    try {
      const job = await startSync();
      setStatus(job);
      if (job.status !== 'running') onComplete();
    } finally {
      setBusy(false);
    }
  }

  const running = status?.status === 'running' || busy;

  return (
    <div className="flex min-w-[200px] flex-col items-end gap-2">
      <button
        type="button"
        onClick={handleSync}
        disabled={running}
        className="inline-flex items-center gap-2 rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {running && (
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 16 16" fill="none" aria-hidden>
            <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeDasharray="20 10" />
          </svg>
        )}
        {running ? 'Syncing…' : 'Sync from GitHub'}
      </button>

      {running && status && (
        <div className="w-full max-w-[180px]">
          <div className="h-1 overflow-hidden rounded-full bg-[var(--color-border)]">
            <div
              className="h-full rounded-full bg-[var(--color-accent)] transition-all duration-500"
              style={{ width: `${Math.min(95, 20 + status.reposSynced * 8)}%` }}
            />
          </div>
          {status.reposSynced > 0 && (
            <p className="mt-1 text-right font-mono text-[10px] text-[var(--color-muted)]">
              {status.reposSynced} repos
            </p>
          )}
        </div>
      )}

      {!running && status?.status === 'completed' && (
        <p className="font-mono text-[10px] text-[var(--color-ok)]">last sync ok</p>
      )}

      {!running && status?.status === 'failed' && status.errorMessage && (
        <p className="max-w-[220px] text-right font-mono text-[10px] text-[var(--color-bad)]">
          {status.errorMessage}
        </p>
      )}
    </div>
  );
}
