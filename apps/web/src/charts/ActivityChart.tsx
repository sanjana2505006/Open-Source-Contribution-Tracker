import * as d3 from 'd3';
import { useEffect, useRef } from 'react';
import type { ContributionTimelinePoint } from '@osct/shared';
import { useTheme } from '../app/ThemeProvider';
import { formatMonth, getChartColors } from './colors';
import {
  appendBarGradients,
  chartDuration,
  chartEase,
  ensureChartTooltip,
  hideTooltip,
  showTooltip,
} from './chartUtils';

type Props = {
  data: ContributionTimelinePoint[];
};

export function ActivityChart({ data }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const { theme } = useTheme();
  const colors = getChartColors(theme);

  useEffect(() => {
    const wrap = wrapRef.current;
    const svgEl = svgRef.current;
    if (!wrap || !svgEl || data.length === 0) return;

    const width = wrap.clientWidth;
    const height = 240;
    const margin = { top: 20, right: 16, bottom: 36, left: 40 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;
    const gradId = `activity-${theme}`;

    const svg = d3.select(svgEl);
    svg.attr('width', width).attr('height', height);
    svg.selectAll('*').remove();

    const defs = svg.append('defs');
    appendBarGradients(defs, colors, gradId);

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3
      .scaleBand<string>()
      .domain(data.map((d) => d.period))
      .range([0, innerW])
      .padding(0.28);

    const maxVal = d3.max(data, (d) => d.pullRequests) ?? 1;
    const y = d3.scaleLinear().domain([0, maxVal]).nice().range([innerH, 0]);

    g.append('g')
      .attr('class', 'chart-grid')
      .call(
        d3
          .axisLeft(y)
          .ticks(4)
          .tickSize(-innerW)
          .tickFormat(() => ''),
      )
      .call((sel) => sel.select('.domain').remove())
      .call((sel) => sel.selectAll('line').attr('stroke', colors.grid).attr('stroke-dasharray', '3,4'));

    g.append('g')
      .attr('transform', `translate(0,${innerH})`)
      .call(
        d3
          .axisBottom(x)
          .tickValues(
            data
              .filter((_, i) => i % Math.ceil(data.length / 6) === 0 || i === data.length - 1)
              .map((d) => d.period),
          )
          .tickFormat((d) => formatMonth(String(d))),
      )
      .call((sel) => sel.selectAll('text').attr('fill', colors.text).attr('font-size', 11))
      .call((sel) => sel.selectAll('line, path').attr('stroke', colors.grid));

    g.append('g')
      .call(d3.axisLeft(y).ticks(4).tickFormat(d3.format('d')))
      .call((sel) => sel.selectAll('text').attr('fill', colors.text).attr('font-size', 11))
      .call((sel) => sel.selectAll('line, path').attr('stroke', colors.grid));

    const barW = x.bandwidth();
    const tip = ensureChartTooltip(wrap);

    const highlight = g
      .append('rect')
      .attr('class', 'chart-hover-band')
      .attr('y', 0)
      .attr('height', innerH)
      .attr('fill', colors.accent)
      .attr('opacity', 0)
      .attr('pointer-events', 'none');

    const prBars = g
      .selectAll<SVGRectElement, ContributionTimelinePoint>('.bar-pr')
      .data(data)
      .join('rect')
      .attr('class', 'bar-pr chart-bar')
      .attr('x', (d) => x(d.period)!)
      .attr('width', barW)
      .attr('rx', 3)
      .attr('y', innerH)
      .attr('height', 0)
      .attr('fill', `url(#${gradId}-pr)`);

    prBars
      .transition()
      .duration(chartDuration)
      .delay((_, i) => i * 28)
      .ease(chartEase)
      .attr('y', (d) => y(d.pullRequests))
      .attr('height', (d) => innerH - y(d.pullRequests));

    const setFocus = (period: string | null, event?: MouseEvent) => {
      const dim = period ? 0.38 : 1;
      prBars.attr('opacity', (d) => (period && d.period !== period ? dim : 1));

      if (!period) {
        highlight.attr('opacity', 0);
        hideTooltip(tip);
        return;
      }

      const point = data.find((d) => d.period === period);
      if (!point) return;

      highlight
        .attr('x', x(period)! - x.padding() * x.step() * 0.15)
        .attr('width', x.bandwidth() + x.padding() * x.step() * 0.3)
        .attr('opacity', theme === 'light' ? 0.08 : 0.14);

      if (event) {
        showTooltip(
          tip,
          wrap,
          `<strong>${formatMonth(period)}</strong>
           <span><i style="background:${colors.pr}"></i>${point.pullRequests} PRs</span>`,
          event.clientX,
          event.clientY,
        );
      }
    };

    g.selectAll<SVGRectElement, ContributionTimelinePoint>('.chart-hit')
      .data(data)
      .join('rect')
      .attr('class', 'chart-hit')
      .attr('x', (d) => x(d.period)! - x.padding() * x.step() * 0.1)
      .attr('width', x.bandwidth() + x.padding() * x.step() * 0.2)
      .attr('y', 0)
      .attr('height', innerH)
      .attr('fill', 'transparent')
      .on('mouseenter', function (event, d) {
        setFocus(d.period, event);
      })
      .on('mousemove', function (event, d) {
        showTooltip(
          tip,
          wrap,
          `<strong>${formatMonth(d.period)}</strong>
           <span><i style="background:${colors.pr}"></i>${d.pullRequests} PRs</span>`,
          event.clientX,
          event.clientY,
        );
      })
      .on('mouseleave', () => setFocus(null));

    return () => hideTooltip(tip);
  }, [data, theme]);

  if (data.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-[var(--color-muted)]">
        No activity in this range.
      </p>
    );
  }

  return (
    <div ref={wrapRef} className="chart-shell w-full">
      <svg ref={svgRef} className="chart-svg" role="img" aria-label="Monthly pull request activity" />
      <div className="mt-3 flex gap-5 text-[11px] font-medium text-[var(--color-muted)]">
        <span className="flex items-center gap-1.5">
          <span className="chart-legend-swatch chart-legend-swatch--pr" />
          Pull requests
        </span>
        <span className="ml-auto hidden text-[10px] sm:inline">Hover a month for details</span>
      </div>
    </div>
  );
}
