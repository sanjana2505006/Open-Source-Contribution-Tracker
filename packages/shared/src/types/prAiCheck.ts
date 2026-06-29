export type PrAiCheckConfidence = 'low' | 'medium' | 'high';

export type PrAiCheckSectionName = 'description' | 'code' | 'commits';

export type PrAiCheckSection = {
  name: PrAiCheckSectionName;
  aiLikelihoodPercent: number;
  rationale: string;
};

export type PrAiCheckResult = {
  owner: string;
  repo: string;
  number: number;
  author: string;
  title: string;
  htmlUrl: string;
  overallAiPercent: number;
  confidence: PrAiCheckConfidence;
  sections: PrAiCheckSection[];
  signals: string[];
  disclaimer: string;
  analyzedAt: string;
};

export type PrAiCheckRequest = {
  url?: string;
  owner?: string;
  repo?: string;
  number?: number;
};
