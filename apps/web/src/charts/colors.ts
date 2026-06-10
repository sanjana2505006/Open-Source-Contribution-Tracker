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
  accent: '#0969da',
  commit: '#8250df',
  pr: '#0969da',
  open: '#0969da',
  closed: '#656d76',
  merged: '#1a7f37',
  muted: '#656d76',
  grid: '#d8dee4',
  text: '#656d76',
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
