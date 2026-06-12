import * as d3 from 'd3';
import { useEffect, useRef } from 'react';
import type { LanguageStat } from '@osct/shared';
import { useTheme } from '../app/ThemeProvider';
import { getChartColors } from './colors';
import {
  chartDuration,
  chartEase,
  ensureChartTooltip,
  hideTooltip,
  languageColor,
  showTooltip,
} from './chartUtils';

type Props = {
  data: LanguageStat[];
};

export function LanguageChart({ data }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const { theme } = useTheme();
  const colors = getChartColors(theme);

  useEffect(() => {
    const wrap = wrapRef.current;
    const svgEl = svgRef.current;
    if (!wrap || !svgEl || data.length === 0) return;

    const width = wrap.clientWidth;
    const height = Math.max(128, data.length * 30 + 16);
    const margin = { top: 8, right: 16, bottom: 8, left: 88 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const svg = d3.select(svgEl);
    svg.attr('width', width).attr('height', height);
    svg.selectAll('*').remove();

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    const tip = ensureChartTooltip(wrap);
    const total = d3.sum(data, (d) => d.count) || 1;

    const maxVal = d3.max(data, (d) => d.count) ?? 1;
    const x = d3.scaleLinear().domain([0, maxVal]).nice().range([0, innerW]);
    const y = d3
      .scaleBand<string>()
      .domain(data.map((d) => d.language))
      .range([0, innerH])
      .padding(0.32);

    const bars = g
      .selectAll<SVGRectElement, LanguageStat>('.bar')
      .data(data)
      .join('rect')
      .attr('class', 'chart-bar')
      .attr('x', 0)
      .attr('y', (d) => y(d.language)!)
      .attr('width', 0)
      .attr('height', y.bandwidth())
      .attr('rx', 4)
      .attr('fill', (d) => languageColor(d.language, colors.accent))
      .on('mouseenter', function (event, d) {
        bars.attr('opacity', (row) => (row.language === d.language ? 1 : 0.4));
        const pct = Math.round((d.count / total) * 100);
        showTooltip(
          tip,
          wrap,
          `<strong>${d.language}</strong><span>${d.count} repos · ${pct}%</span>`,
          event.clientX,
          event.clientY,
        );
      })
      .on('mousemove', function (event, d) {
        const pct = Math.round((d.count / total) * 100);
        showTooltip(
          tip,
          wrap,
          `<strong>${d.language}</strong><span>${d.count} repos · ${pct}%</span>`,
          event.clientX,
          event.clientY,
        );
      })
      .on('mouseleave', () => {
        bars.attr('opacity', 0.92);
        hideTooltip(tip);
      });

    bars
      .transition()
      .duration(chartDuration)
      .delay((_, i) => i * 45)
      .ease(chartEase)
      .attr('width', (d) => x(d.count))
      .attr('opacity', 0.92);

    g.selectAll('.label')
      .data(data)
      .join('text')
      .attr('x', -10)
      .attr('y', (d) => y(d.language)! + y.bandwidth() / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'end')
      .attr('fill', colors.text)
      .attr('font-size', 11)
      .text((d) => d.language);

    return () => hideTooltip(tip);
  }, [data, theme, colors.accent]);

  if (data.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-[var(--color-muted)]">
        No language data yet.
      </p>
    );
  }

  return (
    <div ref={wrapRef} className="chart-shell w-full">
      <svg ref={svgRef} className="chart-svg" role="img" aria-label="Contributions by language" />
    </div>
  );
}
