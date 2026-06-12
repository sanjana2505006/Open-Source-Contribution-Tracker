import * as d3 from 'd3';
import type { ChartColors } from './colors';

const LANGUAGE_COLORS: Record<string, string> = {
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  Python: '#3572a5',
  Java: '#b07219',
  Go: '#00add8',
  Rust: '#dea584',
  Ruby: '#701516',
  PHP: '#4f5d95',
  'C++': '#f34b7d',
  C: '#555555',
  'C#': '#178600',
  Shell: '#89e051',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Swift: '#f05138',
  Kotlin: '#a97bff',
  Dart: '#00b4ab',
  Groovy: '#4298b8',
  Scala: '#c22d40',
  Jupyter: '#da5b0b',
  'Jupyter Notebook': '#da5b0b',
};

export function languageColor(language: string, fallback: string): string {
  return LANGUAGE_COLORS[language] ?? fallback;
}

export function appendBarGradients(
  defs: d3.Selection<SVGDefsElement, unknown, null, undefined>,
  colors: ChartColors,
  prefix: string,
) {
  const pairs = [
    { id: `${prefix}-pr`, from: colors.pr, to: d3.color(colors.pr)?.brighter(0.6)?.formatHex() ?? colors.pr },
    {
      id: `${prefix}-commit`,
      from: colors.commit,
      to: d3.color(colors.commit)?.brighter(0.5)?.formatHex() ?? colors.commit,
    },
    {
      id: `${prefix}-accent`,
      from: colors.accent,
      to: d3.color(colors.accent)?.brighter(0.5)?.formatHex() ?? colors.accent,
    },
  ];

  for (const { id, from, to } of pairs) {
    const grad = defs
      .append('linearGradient')
      .attr('id', id)
      .attr('x1', '0%')
      .attr('y1', '100%')
      .attr('x2', '0%')
      .attr('y2', '0%');

    grad.append('stop').attr('offset', '0%').attr('stop-color', from).attr('stop-opacity', 0.85);
    grad.append('stop').attr('offset', '100%').attr('stop-color', to).attr('stop-opacity', 1);
  }
}

export function ensureChartTooltip(container: HTMLElement): HTMLDivElement {
  let tip = container.querySelector<HTMLDivElement>('.chart-tooltip');
  if (!tip) {
    tip = document.createElement('div');
    tip.className = 'chart-tooltip';
    tip.setAttribute('role', 'status');
    tip.setAttribute('aria-live', 'polite');
    container.appendChild(tip);
  }
  return tip;
}

export function showTooltip(
  tip: HTMLDivElement,
  container: HTMLElement,
  html: string,
  clientX: number,
  clientY: number,
) {
  tip.innerHTML = html;
  tip.classList.add('chart-tooltip--visible');

  const bounds = container.getBoundingClientRect();
  const tipRect = tip.getBoundingClientRect();
  const pad = 12;
  let left = clientX - bounds.left - tipRect.width / 2;
  let top = clientY - bounds.top - tipRect.height - 14;

  left = Math.max(pad, Math.min(left, bounds.width - tipRect.width - pad));
  top = Math.max(pad, top);

  tip.style.left = `${left}px`;
  tip.style.top = `${top}px`;
}

export function hideTooltip(tip: HTMLDivElement) {
  tip.classList.remove('chart-tooltip--visible');
}

export const chartEase = d3.easeCubicOut;
export const chartDuration = 720;
