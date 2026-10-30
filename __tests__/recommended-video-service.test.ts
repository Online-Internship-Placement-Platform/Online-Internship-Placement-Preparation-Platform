import { beforeEach, describe, expect, it, vi } from "vitest";

const videoModel = vi.hoisted(() => ({
  findMany: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({ prisma: { recommendedVideo: videoModel } }));

import {
  createRecommendedVideo,
  deleteRecommendedVideo,
  listRecommendedVideos,
  updateRecommendedVideo,
} from "@/modules/recommended-videos/recommended-video-service";

const record = {
  id: "video-1",
  title: "Interview video",
  youtubeId: "BgLTDT03QtU",
  channelName: "Channel",
  description: "A short description.",
  category: "SOFTWARE_DEVELOPMENT" as const,
};

describe("recommended video persistence service", () => {
  beforeEach(() => vi.clearAllMocks());

  it("loads saved records and derives trusted watch and thumbnail URLs", async () => {
    videoModel.findMany.mockResolvedValue([record]);
    await expect(listRecommendedVideos()).resolves.toEqual([{
      ...record,
      category: "Software Development",
      watchUrl: "https://www.youtube.com/watch?v=BgLTDT03QtU",
      thumbnailUrl: "https://img.youtube.com/vi/BgLTDT03QtU/hqdefault.jpg",
    }]);
    expect(videoModel.findMany).toHaveBeenCalledWith(expect.objectContaining({ orderBy: [{ category: "asc" }, { title: "asc" }] }));
  });

  it("creates and updates database records with the stored domain enum", async () => {
    const input = { title: record.title, youtubeId: record.youtubeId, channelName: record.channelName, description: record.description, category: "Software Development" as const };
    videoModel.create.mockResolvedValue(record);
    await createRecommendedVideo(input);
    expect(videoModel.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ ...input, category: "SOFTWARE_DEVELOPMENT" }),
    }));
    const createdData = videoModel.create.mock.calls[0][0].data;
    expect(createdData.id).toMatch(/^[0-9a-f-]{36}$/i);

    videoModel.update.mockResolvedValue({ ...record, title: "Updated title", category: "DATA_ANALYTICS" });
    const updated = await updateRecommendedVideo("video-1", { ...input, category: "Data & Analytics" });
    expect(videoModel.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: "video-1" },
      data: expect.objectContaining({ category: "DATA_ANALYTICS" }),
    }));
    expect(updated.category).toBe("Data & Analytics");
  });

  it("deletes the persisted record by ID", async () => {
    videoModel.delete.mockResolvedValue({ id: "video-1" });
    await expect(deleteRecommendedVideo("video-1")).resolves.toBeUndefined();
    expect(videoModel.delete).toHaveBeenCalledWith({ where: { id: "video-1", }, select: { id: true } });
  });
});
