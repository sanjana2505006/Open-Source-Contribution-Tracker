import * as d3 from 'd3';
import { useEffect, useRef } from 'react';
import type { ContributionTimelinePoint } from '@osct/shared';
import { useTheme } from '../app/ThemeProvider';
import { formatMonth, getChartColors } from './colors';

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
    const height = 220;
    const margin = { top: 16, right: 12, bottom: 32, left: 36 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const svg = d3.select(svgEl);
    svg.attr('width', width).attr('height', height);
    svg.selectAll('*').remove();

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const x = d3
      .scaleBand<string>()
      .domain(data.map((d) => d.period))
      .range([0, innerW])
      .padding(0.2);

    const maxVal = d3.max(data, (d) => d.total) ?? 1;
    const y = d3.scaleLinear().domain([0, maxVal]).nice().range([innerH, 0]);

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
      .call((sel) => sel.selectAll('text').attr('fill', colors.text))
      .call((sel) => sel.selectAll('line, path').attr('stroke', colors.grid));

    g.append('g')
      .call(d3.axisLeft(y).ticks(4).tickFormat(d3.format('d')))
      .call((sel) => sel.selectAll('text').attr('fill', colors.text))
      .call((sel) => sel.selectAll('line, path').attr('stroke', colors.grid));

    g.selectAll('.bar-pr')
      .data(data)
      .join('rect')
      .attr('class', 'bar-pr')
      .attr('x', (d) => x(d.period)!)
      .attr('width', x.bandwidth() / 2 - 1)
      .attr('y', (d) => y(d.pullRequests))
      .attr('height', (d) => innerH - y(d.pullRequests))
      .attr('fill', colors.pr);

    g.selectAll('.bar-commit')
      .data(data)
      .join('rect')
      .attr('class', 'bar-commit')
      .attr('x', (d) => x(d.period)! + x.bandwidth() / 2)
      .attr('width', x.bandwidth() / 2 - 1)
      .attr('y', (d) => y(d.commits))
      .attr('height', (d) => innerH - y(d.commits))
      .attr('fill', colors.commit);
  }, [data, theme]);

  if (data.length === 0) {
    return (
      <p className="py-16 text-center text-sm text-[var(--color-muted)]">
        No activity in this range.
      </p>
    );
  }

  return (
    <div ref={wrapRef} className="w-full">
      <svg ref={svgRef} role="img" aria-label="Monthly contribution activity" />
      <div className="mt-2 flex gap-4 text-[11px] font-medium text-[var(--color-muted)]">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-sm" style={{ background: colors.pr }} />
          PRs
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-sm" style={{ background: colors.commit }} />
          commits
        </span>
      </div>
    </div>
  );
}
