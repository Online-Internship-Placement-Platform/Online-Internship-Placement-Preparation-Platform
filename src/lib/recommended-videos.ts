export const videoCategories = [
  "Software Development",
  "Data & Analytics",
  "Design / UI/UX",
  "Aptitude & Logical Reasoning",
] as const;

export type VideoCategory = (typeof videoCategories)[number];

export type RecommendedVideo = {
  id: string;
  title: string;
  youtubeId: string;
  channelName: string;
  description: string;
  category: VideoCategory;
  watchUrl: string;
  thumbnailUrl: string;
};

export type RecommendedVideoInput = Pick<
  RecommendedVideo,
  "title" | "youtubeId" | "channelName" | "description" | "category"
>;

export type StoredVideoCategory =
  | "SOFTWARE_DEVELOPMENT"
  | "DATA_ANALYTICS"
  | "DESIGN_UI_UX"
  | "APTITUDE_LOGICAL_REASONING";

const storageCategoryByLabel: Record<VideoCategory, StoredVideoCategory> = {
  "Software Development": "SOFTWARE_DEVELOPMENT",
  "Data & Analytics": "DATA_ANALYTICS",
  "Design / UI/UX": "DESIGN_UI_UX",
  "Aptitude & Logical Reasoning": "APTITUDE_LOGICAL_REASONING",
};

const labelByStorageCategory: Record<StoredVideoCategory, VideoCategory> = {
  SOFTWARE_DEVELOPMENT: "Software Development",
  DATA_ANALYTICS: "Data & Analytics",
  DESIGN_UI_UX: "Design / UI/UX",
  APTITUDE_LOGICAL_REASONING: "Aptitude & Logical Reasoning",
};

export function toStoredVideoCategory(category: VideoCategory): StoredVideoCategory {
  return storageCategoryByLabel[category];
}

export function fromStoredVideoCategory(category: string): VideoCategory | null {
  return Object.hasOwn(labelByStorageCategory, category)
    ? labelByStorageCategory[category as StoredVideoCategory]
    : null;
}

export function serializeRecommendedVideo(video: {
  id: string;
  title: string;
  youtubeId: string;
  channelName: string;
  description: string;
  category: string;
}): RecommendedVideo {
  const category = fromStoredVideoCategory(video.category);
  if (!category) throw new Error("Recommended video has an unsupported category.");

  return {
    ...video,
    category,
    watchUrl: `https://www.youtube.com/watch?v=${video.youtubeId}`,
    thumbnailUrl: `https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`,
  };
}
