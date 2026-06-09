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
          if (job && job.status !== 'running') {
            onComplete();
          }
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
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={handleSync}
        disabled={running}
        className="rounded border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-1.5 text-sm hover:border-[var(--color-accent-dim)] disabled:opacity-50"
      >
        {running ? 'Syncing…' : 'Sync from GitHub'}
      </button>

      {status && (
        <p className="font-mono text-xs text-[var(--color-muted)]">
          {status.status}
          {status.status === 'running' && status.reposSynced > 0
            ? ` · ${status.reposSynced} repos`
            : ''}
          {status.errorMessage ? ` · ${status.errorMessage}` : ''}
        </p>
      )}
    </div>
  );
}
