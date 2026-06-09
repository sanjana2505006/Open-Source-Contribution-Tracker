export const chartColors = {
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

export function formatMonth(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}
