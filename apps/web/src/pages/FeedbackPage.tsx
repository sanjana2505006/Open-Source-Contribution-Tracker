import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { FeedbackCategory } from '@osct/shared';
import { useAuth } from '../app/AuthProvider';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/Panel';
import { submitFeedback } from '../lib/api';

const CATEGORIES: { id: FeedbackCategory; label: string; hint: string }[] = [
  { id: 'feature', label: 'Feature idea', hint: 'Something you wish OSCT did' },
  { id: 'bug', label: 'Bug report', hint: 'Something broken or confusing' },
  { id: 'general', label: 'General feedback', hint: 'Thoughts, questions, UX notes' },
  { id: 'praise', label: 'Something I loved', hint: 'What’s working well for you' },
];

export function FeedbackPage() {
  const { user } = useAuth();
  const [category, setCategory] = useState<FeedbackCategory>('general');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [rating, setRating] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await submitFeedback({
        category,
        message,
        email: email.trim() || undefined,
        rating: rating ?? undefined,
        pageUrl: document.referrer || window.location.pathname,
      });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send feedback');
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <>
        <PageHeader
          eyebrow="Feedback"
          title="Thank you"
          description="Your note is saved — I read every one."
        />
        <main className="page-main">
          <Panel title="Got it" subtitle="Really appreciate you taking the time">
            <div className="feedback-success px-4 py-8 text-center">
              <p className="text-sm text-[var(--color-muted)]">
                {user
                  ? `Thanks @${user.username}. I'll use this to improve OSCT.`
                  : 'Thanks for helping shape OSCT.'}
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                <Link to="/" className="btn btn-primary">
                  Back to Overview
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setSent(false);
                    setMessage('');
                    setRating(null);
                  }}
                  className="btn btn-secondary"
                >
                  Send another
                </button>
              </div>
            </div>
          </Panel>
        </main>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Feedback"
        title="Tell me what you think"
        description="OSCT is early — your honest feedback helps me decide what to build next. Bug, idea, rant, or praise — all welcome."
      />

      <main className="page-main">
        <div className="feedback-layout">
          <Panel title="Send feedback" subtitle="Saved privately for Sanjana to read">
            <form onSubmit={handleSubmit} className="feedback-form">
              <fieldset className="feedback-form__field">
                <legend className="feedback-form__label">What kind of feedback?</legend>
                <div className="feedback-categories">
                  {CATEGORIES.map((item) => (
                    <label
                      key={item.id}
                      className={[
                        'feedback-category',
                        category === item.id && 'feedback-category--active',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      <input
                        type="radio"
                        name="category"
                        value={item.id}
                        checked={category === item.id}
                        onChange={() => setCategory(item.id)}
                        className="sr-only"
                      />
                      <span className="feedback-category__title">{item.label}</span>
                      <span className="feedback-category__hint">{item.hint}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <label className="feedback-form__field">
                <span className="feedback-form__label">Your message</span>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                  minLength={10}
                  maxLength={2000}
                  rows={6}
                  placeholder="What should I know? Be as specific as you can — page, feature, what you expected vs what happened…"
                  className="input feedback-form__textarea"
                />
                <span className="feedback-form__hint">{message.length}/2000</span>
              </label>

              <fieldset className="feedback-form__field">
                <legend className="feedback-form__label">How’s your experience so far? (optional)</legend>
                <div className="feedback-rating" role="radiogroup" aria-label="Rating">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRating(rating === value ? null : value)}
                      className={[
                        'feedback-rating__star',
                        rating !== null && value <= rating && 'feedback-rating__star--active',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      aria-label={`${value} out of 5`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </fieldset>

              <label className="feedback-form__field">
                <span className="feedback-form__label">Email (optional)</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={user ? 'Only if you want a reply' : 'you@example.com — only if you want a reply'}
                  className="input"
                />
              </label>

              {user && (
                <p className="feedback-form__signed-in">
                  Sending as <strong>@{user.username}</strong>
                </p>
              )}

              {error && <p className="alert alert-error">{error}</p>}

              <button type="submit" disabled={submitting || message.trim().length < 10} className="btn btn-primary">
                {submitting ? 'Sending…' : 'Send feedback'}
              </button>
            </form>
          </Panel>

          <aside className="feedback-aside">
            <Panel title="What happens next?" subtitle="No marketing list">
              <ul className="feedback-aside__list">
                <li>Feedback is stored securely and read by me directly.</li>
                <li>I use it to prioritize bugs and features.</li>
                <li>Email is optional — only add it if you want a reply.</li>
                <li>You can also open a GitHub issue for public discussion.</li>
              </ul>
            </Panel>
          </aside>
        </div>
      </main>
    </>
  );
}
