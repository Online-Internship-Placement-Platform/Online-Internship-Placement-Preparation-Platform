import "server-only";

import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import {
  serializeRecommendedVideo,
  toStoredVideoCategory,
  type RecommendedVideoInput,
} from "@/lib/recommended-videos";

const videoSelect = {
  id: true,
  title: true,
  youtubeId: true,
  channelName: true,
  description: true,
  category: true,
} as const;

export async function listRecommendedVideos() {
  const records = await prisma.recommendedVideo.findMany({
    orderBy: [{ category: "asc" }, { title: "asc" }],
    select: videoSelect,
  });
  return records.map(serializeRecommendedVideo);
}

export async function createRecommendedVideo(input: RecommendedVideoInput) {
  const record = await prisma.recommendedVideo.create({
    data: {
      id: randomUUID(),
      ...input,
      category: toStoredVideoCategory(input.category),
    },
    select: videoSelect,
  });
  return serializeRecommendedVideo(record);
}

export async function updateRecommendedVideo(id: string, input: RecommendedVideoInput) {
  const record = await prisma.recommendedVideo.update({
    where: { id },
    data: {
      ...input,
      category: toStoredVideoCategory(input.category),
    },
    select: videoSelect,
  });
  return serializeRecommendedVideo(record);
}

export async function deleteRecommendedVideo(id: string) {
  await prisma.recommendedVideo.delete({ where: { id }, select: { id: true } });
}

export function isDuplicateRecommendedVideoError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2002";
}

export function isMissingRecommendedVideoError(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && error.code === "P2025";
}
