export type Person = {
  id: string;
  name: string;
  handle: string;
  role?: string;
  avatar: {
    glyph: string;
    background: string;
    color: string;
    image?: string;
  };
};

export type MediaAsset = {
  id: string;
  src: string;
  alt: string;
  width: number;
  height: number;
  caption?: string;
  visualTags?: string[];
};

export type Verdict = {
  id: string;
  authorId: string;
  mediaId?: string;
  score?: number;
  heading?: string;
  body: string;
  lesson?: string;
};

export type Reply = {
  id: string;
  authorId: string;
  body: string;
  replies?: Reply[];
};

export type ContentUnit = {
  id: string;
  authorId: string;
  label?: string;
  time?: string;
  startSec?: number;
  body: string;
  prompt?: string;
  media: MediaAsset[];
  verdicts?: Verdict[];
  replies?: Reply[];
  metrics?: { likes: number; replies: number; reposts: number };
};

export type SiteContent = {
  version: 1;
  site: {
    id: string;
    title: string;
    episode?: string;
    subtitle: string;
    format: "contest" | "timeline" | "gallery" | "thread";
    disclosure: string;
    accent: string;
  };
  rules: {
    mediaCount: number;
    maxMediaPerUnit: number;
    maxRepliesPerUnit: number;
    maxReplyDepth: number;
    requireHighAnchor?: boolean;
  };
  people: Person[];
  units: ContentUnit[];
};

