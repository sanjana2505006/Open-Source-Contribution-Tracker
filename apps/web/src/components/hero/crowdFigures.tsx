type FigureProps = {
  className?: string;
  style?: React.CSSProperties;
};

const OUTLINE = '#141820';
const SKIN = '#f5c9a8';
const SKIN_SHADOW = '#e8a87c';

function AnimeEyes({ cx = 40, cy = 38, spread = 10 }: { cx?: number; cy?: number; spread?: number }) {
  return (
    <g>
      <ellipse cx={cx - spread} cy={cy} rx="6.5" ry="8" fill="#fff" stroke={OUTLINE} strokeWidth="1.6" />
      <ellipse cx={cx + spread} cy={cy} rx="6.5" ry="8" fill="#fff" stroke={OUTLINE} strokeWidth="1.6" />
      <circle cx={cx - spread + 1} cy={cy + 1} r="4" fill="#3b82f6" />
      <circle cx={cx + spread + 1} cy={cy + 1} r="4" fill="#3b82f6" />
      <circle cx={cx - spread + 2.5} cy={cy - 1.5} r="1.6" fill="#fff" />
      <circle cx={cx + spread + 2.5} cy={cy - 1.5} r="1.6" fill="#fff" />
    </g>
  );
}

function Shadow() {
  return <ellipse cx="40" cy="114" rx="18" ry="4" fill="#000" opacity="0.25" />;
}

export function FigureCoder({ className, style }: FigureProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 80 120" aria-hidden>
      <Shadow />
      <path d="M24 72h32l-4 28H28L24 72z" fill="#58a6ff" stroke={OUTLINE} strokeWidth="2" strokeLinejoin="round" />
      <path d="M18 58h44l-6 16H24l-6-16z" fill="#388bfd" stroke={OUTLINE} strokeWidth="2" />
      <rect x="26" y="62" width="28" height="16" rx="3" fill="#1f2937" stroke={OUTLINE} strokeWidth="1.8" />
      <path d="M30 66h20M30 70h14" stroke="#58a6ff" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="40" cy="36" r="20" fill={SKIN} stroke={OUTLINE} strokeWidth="2" />
      <path d="M20 28c2-14 14-22 28-18 10 3 16 14 14 26-8-2-16-4-24-2-8 2-14-1-18-6z" fill="#ec4899" stroke={OUTLINE} strokeWidth="2" />
      <path d="M22 34c6-8 18-10 26-4" fill="#ec4899" />
      <AnimeEyes />
      <path d="M34 50q6 5 12 0" fill="none" stroke={OUTLINE} strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="28" cy="44" rx="4" ry="2.5" fill="#fda4af" opacity="0.55" />
      <ellipse cx="52" cy="44" rx="4" ry="2.5" fill="#fda4af" opacity="0.55" />
    </svg>
  );
}

export function FigureWave({ className, style }: FigureProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 80 120" aria-hidden>
      <Shadow />
      <path d="M26 74h28l-3 26H29L26 74z" fill="#3fb950" stroke={OUTLINE} strokeWidth="2" />
      <path d="M20 56h40l-5 20H25l-5-20z" fill="#2ea043" stroke={OUTLINE} strokeWidth="2" />
      <circle cx="40" cy="35" r="19" fill={SKIN} stroke={OUTLINE} strokeWidth="2" />
      <path d="M22 18c0-12 12-20 26-16 12 4 18 16 14 28-10-4-20-6-30-2-6 2-8-2-10-10z" fill="#fbbf24" stroke={OUTLINE} strokeWidth="2" />
      <path d="M58 30l10 8-8 6" fill={SKIN} stroke={OUTLINE} strokeWidth="2" strokeLinejoin="round" />
      <path d="M12 42l12-6" fill={SKIN} stroke={OUTLINE} strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="32" cy="36" rx="6" ry="7.5" fill="#fff" stroke={OUTLINE} strokeWidth="1.6" />
      <ellipse cx="48" cy="36" rx="6" ry="7.5" fill="#fff" stroke={OUTLINE} strokeWidth="1.6" />
      <circle cx="33" cy="37" r="3.5" fill="#22c55e" />
      <circle cx="49" cy="37" r="3.5" fill="#22c55e" />
      <path d="M34 48q6 6 12 0" fill="none" stroke={OUTLINE} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function FigureMerge({ className, style }: FigureProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 80 120" aria-hidden>
      <Shadow />
      <path d="M25 73h30l-4 27H29L25 73z" fill="#a371f7" stroke={OUTLINE} strokeWidth="2" />
      <path d="M18 55h44l-6 20H24l-6-20z" fill="#8957e5" stroke={OUTLINE} strokeWidth="2" />
      <circle cx="40" cy="34" r="18" fill={SKIN} stroke={OUTLINE} strokeWidth="2" />
      <path d="M24 16c4-12 16-18 28-12 8 4 12 14 10 24-8-4-18-6-26-2-6 2-10-2-12-10z" fill="#c4b5fd" stroke={OUTLINE} strokeWidth="2" />
      <AnimeEyes cy={36} />
      <path d="M32 50a8 6 0 008 0" fill="#fb7185" stroke={OUTLINE} strokeWidth="1.5" />
      <path d="M54 20l4 6 6 1-4 4 1 6-6-3-6 3 1-6-4-4 6-1 4-6z" fill="#fbbf24" stroke={OUTLINE} strokeWidth="1.2" />
      <path d="M14 48l10 4M66 48l-10 4" stroke={SKIN_SHADOW} strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}

export function FigureThinker({ className, style }: FigureProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 80 120" aria-hidden>
      <Shadow />
      <path d="M27 74h26l-3 26H30L27 74z" fill="#64748b" stroke={OUTLINE} strokeWidth="2" />
      <path d="M22 56h36l-4 18H26l-4-18z" fill="#475569" stroke={OUTLINE} strokeWidth="2" />
      <circle cx="40" cy="35" r="18" fill={SKIN} stroke={OUTLINE} strokeWidth="2" />
      <path d="M22 20c2-10 14-18 26-14 10 4 14 12 12 22-8-2-16-2-24 0-6 1-10-2-14-8z" fill="#334155" stroke={OUTLINE} strokeWidth="2" />
      <path d="M50 24c8 2 12 10 10 18" fill="none" stroke={SKIN_SHADOW} strokeWidth="5" strokeLinecap="round" />
      <ellipse cx="32" cy="36" rx="5.5" ry="7" fill="#fff" stroke={OUTLINE} strokeWidth="1.6" />
      <ellipse cx="46" cy="36" rx="5.5" ry="7" fill="#fff" stroke={OUTLINE} strokeWidth="1.6" />
      <circle cx="32" cy="37" r="3" fill="#6366f1" />
      <circle cx="46" cy="37" r="3" fill="#6366f1" />
      <path d="M36 50h8" stroke={OUTLINE} strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="54" cy="18" rx="8" ry="6" fill="#94a3b8" stroke={OUTLINE} strokeWidth="1.5" />
      <text x="50" y="21" fontSize="8" fill={OUTLINE} fontFamily="monospace">?</text>
    </svg>
  );
}

export function FigureStar({ className, style }: FigureProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 80 120" aria-hidden>
      <Shadow />
      <path d="M26 72h28l-3 28H29L26 72z" fill="#f97316" stroke={OUTLINE} strokeWidth="2" />
      <path d="M20 54h40l-5 20H25l-5-20z" fill="#ea580c" stroke={OUTLINE} strokeWidth="2" />
      <circle cx="40" cy="34" r="19" fill={SKIN} stroke={OUTLINE} strokeWidth="2" />
      <path d="M20 22c4-14 18-22 32-16 10 4 14 14 10 26-10-2-18-4-28-2-8 2-12-2-14-8z" fill="#fde047" stroke={OUTLINE} strokeWidth="2" />
      <polygon points="32,34 34,40 40,40 35,44 37,50 32,46 27,50 29,44 24,40 30,40" fill="#fbbf24" stroke={OUTLINE} strokeWidth="1" />
      <polygon points="48,34 50,40 56,40 51,44 53,50 48,46 43,50 45,44 40,40 46,40" fill="#fbbf24" stroke={OUTLINE} strokeWidth="1" />
      <path d="M33 52a7 5 0 0014 0" fill="#fb7185" stroke={OUTLINE} strokeWidth="1.5" />
      <path d="M58 14l2 4 4 1-3 3 1 4-4-2-4 2 1-4-3-3 4-1-2-4z" fill="#fde047" stroke={OUTLINE} strokeWidth="1" />
    </svg>
  );
}

export function FigureCoffee({ className, style }: FigureProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 80 120" aria-hidden>
      <Shadow />
      <path d="M27 74h26l-3 26H30L27 74z" fill="#0d9488" stroke={OUTLINE} strokeWidth="2" />
      <path d="M22 56h36l-4 18H26l-4-18z" fill="#0f766e" stroke={OUTLINE} strokeWidth="2" />
      <circle cx="40" cy="35" r="18" fill={SKIN} stroke={OUTLINE} strokeWidth="2" />
      <path d="M22 18c2-12 14-20 28-14 10 4 14 14 12 24-8-2-18-4-26-2-8 2-12-2-14-8z" fill="#92400e" stroke={OUTLINE} strokeWidth="2" />
      <AnimeEyes cy={36} />
      <path d="M34 50q6 4 12 0" fill="none" stroke={OUTLINE} strokeWidth="2" strokeLinecap="round" />
      <rect x="52" y="48" width="12" height="14" rx="2" fill="#fff" stroke={OUTLINE} strokeWidth="1.8" />
      <path d="M52 50h12M54 52h8" stroke="#92400e" strokeWidth="1.2" />
      <path d="M64 52h4a3 3 0 010 6h-4" fill="none" stroke={OUTLINE} strokeWidth="1.5" />
      <path d="M56 46c0-4-2-6-4-6" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}

export function FigureCatDev({ className, style }: FigureProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 80 120" aria-hidden>
      <Shadow />
      <path d="M26 73h28l-3 27H29L26 73z" fill="#f472b6" stroke={OUTLINE} strokeWidth="2" />
      <path d="M20 55h40l-5 20H25l-5-20z" fill="#ec4899" stroke={OUTLINE} strokeWidth="2" />
      <circle cx="40" cy="36" r="18" fill={SKIN} stroke={OUTLINE} strokeWidth="2" />
      <path d="M22 28 L18 14 L30 22 Z" fill="#fb923c" stroke={OUTLINE} strokeWidth="2" strokeLinejoin="round" />
      <path d="M58 28 L62 14 L50 22 Z" fill="#fb923c" stroke={OUTLINE} strokeWidth="2" strokeLinejoin="round" />
      <path d="M22 20c4-10 14-16 26-10 10 4 14 12 12 22-8-2-16-2-24 0-6 1-10-2-14-8z" fill="#fb923c" stroke={OUTLINE} strokeWidth="2" />
      <ellipse cx="32" cy="38" rx="7" ry="9" fill="#fff" stroke={OUTLINE} strokeWidth="1.6" />
      <ellipse cx="48" cy="38" rx="7" ry="9" fill="#fff" stroke={OUTLINE} strokeWidth="1.6" />
      <ellipse cx="32" cy="40" rx="5" ry="6" fill="#f97316" />
      <ellipse cx="48" cy="40" rx="5" ry="6" fill="#f97316" />
      <ellipse cx="32" cy="38" rx="1.5" ry="2" fill="#000" />
      <ellipse cx="48" cy="38" rx="1.5" ry="2" fill="#000" />
      <path d="M36 50q4 5 8 0" fill="none" stroke={OUTLINE} strokeWidth="2" strokeLinecap="round" />
      <path d="M30 46h4M46 46h4" stroke="#fda4af" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function FigureJump({ className, style }: FigureProps) {
  return (
    <svg className={className} style={style} viewBox="0 0 80 120" aria-hidden>
      <Shadow />
      <path d="M28 68h24l-2 32H30L28 68z" fill="#ef4444" stroke={OUTLINE} strokeWidth="2" />
      <path d="M24 52h32l-3 18H27l-3-18z" fill="#dc2626" stroke={OUTLINE} strokeWidth="2" />
      <path d="M22 58l-8-14M58 58l8-14" stroke={SKIN_SHADOW} strokeWidth="6" strokeLinecap="round" />
      <path d="M30 78l-6 22M50 78l6 22" stroke={OUTLINE} strokeWidth="5" strokeLinecap="round" />
      <circle cx="40" cy="30" r="17" fill={SKIN} stroke={OUTLINE} strokeWidth="2" />
      <path d="M24 14c2-12 14-18 26-12 10 4 14 12 12 22-8-2-16-2-24 0-6 1-10-2-12-8z" fill="#f43f5e" stroke={OUTLINE} strokeWidth="2" />
      <AnimeEyes cy={32} spread={9} />
      <path d="M32 44a8 6 0 0016 0" fill="#fb7185" stroke={OUTLINE} strokeWidth="1.5" />
    </svg>
  );
}

export const CROWD_FIGURES = [
  FigureCoder,
  FigureWave,
  FigureMerge,
  FigureThinker,
  FigureStar,
  FigureCoffee,
  FigureCatDev,
  FigureJump,
] as const;
