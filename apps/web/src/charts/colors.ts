import type { Theme } from '../app/ThemeProvider';

const chartColorsDark = {
  accent: '#539bf5',
  commit: '#a371f7',
  pr: '#539bf5',
  open: '#539bf5',
  closed: '#7a8494',
  merged: '#3fb950',
  muted: '#7a8494',
  grid: '#252a33',
  text: '#7a8494',
};

const chartColorsLight = {
  accent: '#0870d3',
  commit: '#7c3aed',
  pr: '#0870d3',
  open: '#0870d3',
  closed: '#5c6570',
  merged: '#116329',
  muted: '#5c6570',
  grid: '#d8dee8',
  text: '#5c6570',
};

export type ChartColors = {
  accent: string;
  commit: string;
  pr: string;
  open: string;
  closed: string;
  merged: string;
  muted: string;
  grid: string;
  text: string;
};

export function getChartColors(theme: Theme): ChartColors {
  return theme === 'light' ? chartColorsLight : chartColorsDark;
}

export const chartColors = chartColorsDark;

export function formatMonth(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}
