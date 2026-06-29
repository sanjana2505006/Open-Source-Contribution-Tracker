import type { IssueAiCheckResult, PrAiCheckResult } from '@osct/shared';

export type AiCheckResult = PrAiCheckResult | IssueAiCheckResult;

const SECTION_LABELS: Record<string, string> = {
  description: 'Description',
  code: 'Code changes',
  commits: 'Commit messages',
  comments: 'Comments',
  title: 'Title',
};

function aiLevel(percent: number): string {
  if (percent >= 70) return 'Likely AI-assisted';
  if (percent >= 40) return 'Mixed signals';
  return 'Likely human-written';
}

function aiLevelClass(percent: number): string {
  if (percent >= 70) return 'pr-ai-level--high';
  if (percent >= 40) return 'pr-ai-level--medium';
  return 'pr-ai-level--low';
}

type Props = {
  result: AiCheckResult;
};

export function AiCheckResultView({ result }: Props) {
  return (
    <div className="pr-ai-result">
      <div className="pr-ai-result__hero">
        <div className={`pr-ai-level ${aiLevelClass(result.overallAiPercent)}`}>
          <span className="pr-ai-level__percent">{result.overallAiPercent}%</span>
          <span className="pr-ai-level__label">{aiLevel(result.overallAiPercent)}</span>
        </div>
        <div className="pr-ai-result__meta">
          <a href={result.htmlUrl} target="_blank" rel="noreferrer" className="pr-ai-result__title">
            {result.title}
          </a>
          <p className="pr-ai-result__sub">
            {result.owner}/{result.repo}#{result.number} · by @{result.author} ·{' '}
            {result.confidence} confidence
          </p>
        </div>
      </div>

      <div className="pr-ai-sections">
        {result.sections.map((section) => (
          <div key={section.name} className="pr-ai-section">
            <div className="pr-ai-section__head">
              <span className="pr-ai-section__name">
                {SECTION_LABELS[section.name] ?? section.name}
              </span>
              <span className="pr-ai-section__pct">{section.aiLikelihoodPercent}%</span>
            </div>
            <div className="pr-ai-section__bar" aria-hidden>
              <span style={{ width: `${section.aiLikelihoodPercent}%` }} />
            </div>
            <p className="pr-ai-section__why">{section.rationale}</p>
          </div>
        ))}
      </div>

      {result.signals.length > 0 && (
        <div className="pr-ai-signals">
          <p className="pr-ai-signals__label">Why it might look AI-generated</p>
          <ul>
            {result.signals.map((signal) => (
              <li key={signal}>{signal}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="pr-ai-disclaimer">{result.disclaimer}</p>
    </div>
  );
}
