export enum Sources {
  MEDIUM = "MEDIUM",
  SUBSTACK = "SUBSTACK",
  RSS = "RSS",
};

export interface ResourceI {
  url: string;
  title?: string;
  source?: Sources;
  description?: string;
  content?: string;
  summary?: string;
  lastSummaryUpdate?: Date;
  image?: string;
  authorsName?: string;
  datePublished?: Date;
  numberOfLikes?: number;
  numberOfComments?: number;
  latest: boolean;
  isSummaryNew?: boolean;
}

export const viewport = {
  width: 1000,
  height: 9999,
};