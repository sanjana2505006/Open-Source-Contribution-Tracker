type Props = {
  className?: string;
};

/** Git pull-request — circles + strokes only (no SVG arc flags that break when minified). */
export function PullRequestIcon({ className = 'h-4 w-4 shrink-0' }: Props) {
  return (
    <svg
      className={className}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden
    >
      <circle cx="4" cy="3.75" r="2.25" fill="currentColor" />
      <circle cx="4" cy="12.25" r="2.25" fill="currentColor" />
      <circle cx="12.5" cy="5.25" r="2.25" fill="currentColor" />
      <path
        d="M4 6v4.5"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
      <path
        d="M6.25 12.25h4a2 2 0 0 0 2-2V5.25"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
