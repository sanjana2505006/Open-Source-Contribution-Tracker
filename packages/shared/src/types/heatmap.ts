export type HeatmapDay = {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
  color?: string;
};

export type HeatmapWeek = {
  days: HeatmapDay[];
};

export type ContributionHeatmap = {
  year: number;
  totalContributions: number;
  weeks: HeatmapWeek[];
  years: number[];
};
