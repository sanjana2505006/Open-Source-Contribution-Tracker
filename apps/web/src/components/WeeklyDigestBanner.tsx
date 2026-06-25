import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { fetchWeeklyDigest } from '../lib/digestApi';

export function WeeklyDigestBanner() {
  const [stuckTotal, setStuckTotal] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchWeeklyDigest()
      .then((digest) => {
        if (!cancelled) setStuckTotal(digest.stuckTotal);
      })
      .catch(() => {
        if (!cancelled) setStuckTotal(null);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (stuckTotal === null || stuckTotal === 0) return null;

  return (
    <div className="digest-banner animate-fade-up" role="status">
      <div className="digest-banner__content">
        <span className="digest-banner__badge">{stuckTotal}</span>
        <p className="digest-banner__copy">
          {stuckTotal === 1
            ? 'You have 1 stuck issue with no activity for 30+ days.'
            : `You have ${stuckTotal} stuck issues with no activity for 30+ days.`}{' '}
          <Link to="/digest" className="digest-banner__link">
            View weekly digest
          </Link>
        </p>
      </div>
    </div>
  );
}
