import * as d3 from 'd3';
import { useEffect, useRef } from 'react';
import type { PullRequestStats } from '@osct/shared';
import { useTheme } from '../app/ThemeProvider';
import { getChartColors } from './colors';
import { chartDuration, chartEase, ensureChartTooltip, hideTooltip, showTooltip } from './chartUtils';

type Props = {
  data: PullRequestStats;
};

export function PullRequestChart({ data }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const { theme } = useTheme();
  const colors = getChartColors(theme);

  useEffect(() => {
    const wrap = wrapRef.current;
    const svgEl = svgRef.current;
    if (!wrap || !svgEl) return;

    const rows = [
      { key: 'merged', label: 'Merged', color: colors.merged },
      { key: 'open', label: 'Open', color: colors.open },
      { key: 'closed', label: 'Closed', color: colors.closed },
    ] as const;

    const items = rows.map((r) => ({
      label: r.label,
      value: data[r.key],
      color: r.color,
    }));

    const width = wrap.clientWidth;
    const height = 148;
    const margin = { top: 8, right: 36, bottom: 8, left: 64 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const svg = d3.select(svgEl);
    svg.attr('width', width).attr('height', height);
    svg.selectAll('*').remove();

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);
    const tip = ensureChartTooltip(wrap);

    const maxVal = d3.max(items, (d) => d.value) ?? 1;
    const x = d3.scaleLinear().domain([0, maxVal]).nice().range([0, innerW]);
    const y = d3
      .scaleBand<string>()
      .domain(items.map((d) => d.label))
      .range([0, innerH])
      .padding(0.38);

    const bars = g
      .selectAll<SVGRectElement, (typeof items)[number]>('.bar')
      .data(items)
      .join('rect')
      .attr('class', 'chart-bar')
      .attr('x', 0)
      .attr('y', (d) => y(d.label)!)
      .attr('width', 0)
      .attr('height', y.bandwidth())
      .attr('rx', 4)
      .attr('fill', (d) => d.color)
      .on('mouseenter', function (event, d) {
        d3.select(this).attr('opacity', 1);
        bars.filter((row) => row.label !== d.label).attr('opacity', 0.45);
        const pct = data.total > 0 ? Math.round((d.value / data.total) * 100) : 0;
        showTooltip(
          tip,
          wrap,
          `<strong>${d.label}</strong><span>${d.value} PRs · ${pct}% of total</span>`,
          event.clientX,
          event.clientY,
        );
      })
      .on('mousemove', function (event, d) {
        const pct = data.total > 0 ? Math.round((d.value / data.total) * 100) : 0;
        showTooltip(
          tip,
          wrap,
          `<strong>${d.label}</strong><span>${d.value} PRs · ${pct}% of total</span>`,
          event.clientX,
          event.clientY,
        );
      })
      .on('mouseleave', () => {
        bars.attr('opacity', 1);
        hideTooltip(tip);
      });

    bars
      .transition()
      .duration(chartDuration)
      .delay((_, i) => i * 90)
      .ease(chartEase)
      .attr('width', (d) => x(d.value));

    g.selectAll('.label')
      .data(items)
      .join('text')
      .attr('x', -8)
      .attr('y', (d) => y(d.label)! + y.bandwidth() / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'end')
      .attr('fill', colors.text)
      .attr('font-size', 11)
      .text((d) => d.label);

    g.selectAll('.value')
      .data(items)
      .join('text')
      .attr('x', (d) => x(d.value) + 8)
      .attr('y', (d) => y(d.label)! + y.bandwidth() / 2)
      .attr('dy', '0.35em')
      .attr('fill', colors.text)
      .attr('font-size', 11)
      .attr('opacity', 0)
      .text((d) => d.value)
      .transition()
      .duration(chartDuration)
      .delay((_, i) => i * 90 + 200)
      .ease(chartEase)
      .attr('opacity', 1)
      .attr('x', (d) => x(d.value) + 8);

    return () => hideTooltip(tip);
  }, [data, theme]);

  if (data.total === 0) {
    return (
      <p className="py-10 text-center text-sm text-[var(--color-muted)]">No pull requests.</p>
    );
  }

  return (
    <div ref={wrapRef} className="chart-shell w-full">
      <svg ref={svgRef} className="chart-svg" role="img" aria-label="Pull request breakdown" />
    </div>
  );
}
