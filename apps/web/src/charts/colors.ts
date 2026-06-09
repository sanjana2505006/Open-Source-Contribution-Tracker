export const chartColors = {
  accent: '#3d8bfd',
  commit: '#3ecf8e',
  pr: '#3d8bfd',
  open: '#3d8bfd',
  closed: '#8b939e',
  merged: '#3ecf8e',
  muted: '#8b939e',
  grid: '#2a2f38',
  text: '#8b939e',
};

export function formatMonth(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}
