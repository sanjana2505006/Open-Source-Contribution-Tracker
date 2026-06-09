import * as d3 from 'd3';
import { useEffect, useRef } from 'react';
import type { LanguageStat } from '@osct/shared';
import { chartColors } from './colors';

type Props = {
  data: LanguageStat[];
};

export function LanguageChart({ data }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const svgEl = svgRef.current;
    if (!wrap || !svgEl || data.length === 0) return;

    const width = wrap.clientWidth;
    const height = Math.max(120, data.length * 28 + 16);
    const margin = { top: 8, right: 12, bottom: 8, left: 72 };
    const innerW = width - margin.left - margin.right;

    const svg = d3.select(svgEl);
    svg.attr('width', width).attr('height', height);
    svg.selectAll('*').remove();

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const maxVal = d3.max(data, (d) => d.count) ?? 1;
    const x = d3.scaleLinear().domain([0, maxVal]).nice().range([0, innerW]);
    const y = d3
      .scaleBand<string>()
      .domain(data.map((d) => d.language))
      .range([0, height - margin.top - margin.bottom])
      .padding(0.3);

    g.selectAll('.bar')
      .data(data)
      .join('rect')
      .attr('x', 0)
      .attr('y', (d) => y(d.language)!)
      .attr('width', (d) => x(d.count))
      .attr('height', y.bandwidth())
      .attr('fill', chartColors.accent)
      .attr('opacity', 0.85);

    g.selectAll('.label')
      .data(data)
      .join('text')
      .attr('x', -8)
      .attr('y', (d) => y(d.language)! + y.bandwidth() / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'end')
      .attr('fill', chartColors.text)
      .attr('font-size', 11)
      .text((d) => d.language);
  }, [data]);

  if (data.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-[var(--color-muted)]">
        No language data yet.
      </p>
    );
  }

  return (
    <div ref={wrapRef} className="w-full">
      <svg ref={svgRef} role="img" aria-label="Contributions by language" />
    </div>
  );
}
