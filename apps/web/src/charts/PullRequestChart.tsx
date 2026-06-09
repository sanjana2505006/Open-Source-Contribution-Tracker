import * as d3 from 'd3';
import { useEffect, useRef } from 'react';
import type { PullRequestStats } from '@osct/shared';
import { chartColors } from './colors';

type Props = {
  data: PullRequestStats;
};

const rows = [
  { key: 'merged', label: 'Merged', color: chartColors.merged },
  { key: 'open', label: 'Open', color: chartColors.open },
  { key: 'closed', label: 'Closed', color: chartColors.closed },
] as const;

export function PullRequestChart({ data }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const svgEl = svgRef.current;
    if (!wrap || !svgEl) return;

    const items = rows.map((r) => ({
      label: r.label,
      value: data[r.key],
      color: r.color,
    }));

    const width = wrap.clientWidth;
    const height = 140;
    const margin = { top: 8, right: 12, bottom: 8, left: 64 };
    const innerW = width - margin.left - margin.right;

    const svg = d3.select(svgEl);
    svg.attr('width', width).attr('height', height);
    svg.selectAll('*').remove();

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const maxVal = d3.max(items, (d) => d.value) ?? 1;
    const x = d3.scaleLinear().domain([0, maxVal]).nice().range([0, innerW]);
    const y = d3
      .scaleBand<string>()
      .domain(items.map((d) => d.label))
      .range([0, height - margin.top - margin.bottom])
      .padding(0.35);

    g.selectAll('.bar')
      .data(items)
      .join('rect')
      .attr('x', 0)
      .attr('y', (d) => y(d.label)!)
      .attr('width', (d) => x(d.value))
      .attr('height', y.bandwidth())
      .attr('fill', (d) => d.color);

    g.selectAll('.label')
      .data(items)
      .join('text')
      .attr('x', -8)
      .attr('y', (d) => y(d.label)! + y.bandwidth() / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'end')
      .attr('fill', chartColors.text)
      .attr('font-size', 11)
      .text((d) => d.label);

    g.selectAll('.value')
      .data(items)
      .join('text')
      .attr('x', (d) => x(d.value) + 6)
      .attr('y', (d) => y(d.label)! + y.bandwidth() / 2)
      .attr('dy', '0.35em')
      .attr('fill', chartColors.text)
      .attr('font-size', 11)
      .text((d) => d.value);
  }, [data]);

  if (data.total === 0) {
    return (
      <p className="py-10 text-center text-sm text-[var(--color-muted)]">No pull requests.</p>
    );
  }

  return (
    <div ref={wrapRef} className="w-full">
      <svg ref={svgRef} role="img" aria-label="Pull request breakdown" />
    </div>
  );
}
