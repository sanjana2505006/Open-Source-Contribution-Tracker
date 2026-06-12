export type FeedbackCategory = 'bug' | 'feature' | 'general' | 'praise';

export type FeedbackSubmit = {
  category: FeedbackCategory;
  message: string;
  email?: string;
  rating?: number;
  pageUrl?: string;
};

export type FeedbackItem = {
  id: string;
  username: string | null;
  email: string | null;
  category: FeedbackCategory;
  message: string;
  rating: number | null;
  pageUrl: string | null;
  createdAt: string;
};

export type FeedbackList = {
  items: FeedbackItem[];
  total: number;
};
