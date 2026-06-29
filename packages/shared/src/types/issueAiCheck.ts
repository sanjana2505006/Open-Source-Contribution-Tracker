export type IssueAiCheckConfidence = 'low' | 'medium' | 'high';

export type IssueAiCheckSectionName = 'description' | 'comments' | 'title';

export type IssueAiCheckSection = {
  name: IssueAiCheckSectionName;
  aiLikelihoodPercent: number;
  rationale: string;
};

export type IssueAiCheckResult = {
  owner: string;
  repo: string;
  number: number;
  author: string;
  title: string;
  htmlUrl: string;
  overallAiPercent: number;
  confidence: IssueAiCheckConfidence;
  sections: IssueAiCheckSection[];
  signals: string[];
  disclaimer: string;
  analyzedAt: string;
};

export type IssueAiCheckRequest = {
  url?: string;
  owner?: string;
  repo?: string;
  number?: number;
};
