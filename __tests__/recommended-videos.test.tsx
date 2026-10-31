import { cleanup, fireEvent, render, screen, within, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RecommendedVideosView } from "@/components/recommended-videos-view";
import {
  serializeRecommendedVideo,
  videoCategories,
  type RecommendedVideo,
  type StoredVideoCategory,
} from "@/lib/recommended-videos";

const storedCategories: StoredVideoCategory[] = [
  "SOFTWARE_DEVELOPMENT",
  "DATA_ANALYTICS",
  "DESIGN_UI_UX",
  "APTITUDE_LOGICAL_REASONING",
];

const videos: RecommendedVideo[] = videoCategories.flatMap((category, categoryIndex) =>
  Array.from({ length: 3 }, (_, videoIndex) => {
    const youtubeId = `yt${String(categoryIndex * 3 + videoIndex + 1).padStart(9, "0")}`;
    return serializeRecommendedVideo({
      id: `${categoryIndex}-${videoIndex}`,
      title: `${category} video ${videoIndex + 1}`,
      youtubeId,
      channelName: "Example Channel",
      description: "A useful learning video.",
      category: storedCategories[categoryIndex],
    });
  }),
);

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({ videos }) }));
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("recommended videos", () => {
  it("constructs watch and thumbnail URLs from the validated YouTube ID", () => {
    for (const video of videos) {
      expect(video.watchUrl).toBe(`https://www.youtube.com/watch?v=${video.youtubeId}`);
      expect(video.thumbnailUrl).toBe(`https://img.youtube.com/vi/${video.youtubeId}/hqdefault.jpg`);
    }
  });

  it("shows all categories by default and filters to the selected category", async () => {
    render(<RecommendedVideosView />);

    await waitFor(() => expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(4));
    expect(screen.getAllByRole("link")).toHaveLength(12);

    fireEvent.click(screen.getByRole("button", { name: "Data & Analytics" }));

    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(1);
    expect(screen.getByRole("heading", { name: "Data & Analytics" })).toBeTruthy();
    expect(screen.getAllByRole("link")).toHaveLength(3);
    expect(within(screen.getByRole("region", { name: "Data & Analytics" })).getAllByRole("link")).toHaveLength(3);

    fireEvent.click(screen.getByRole("button", { name: "All Videos" }));
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(4);
    expect(screen.getAllByRole("link")).toHaveLength(12);
  });

  it("opens each video link safely in a new tab", async () => {
    const { container } = render(<RecommendedVideosView />);
    await waitFor(() => expect(container.querySelectorAll("a")).toHaveLength(12));

    for (const link of container.querySelectorAll<HTMLAnchorElement>("a")) {
      const videoId = new URL(link.href).searchParams.get("v");
      expect(videoId).toBeTruthy();
      expect(link.target).toBe("_blank");
      expect(link.rel).toBe("noopener noreferrer");
      expect(videos.some((video) => video.youtubeId === videoId)).toBe(true);
    }
  });

  it("shows a text fallback when a YouTube thumbnail fails to load", async () => {
    render(<RecommendedVideosView />);
    const thumbnail = await screen.findByAltText("Thumbnail for Software Development video 1");
    fireEvent.error(thumbnail);

    expect(screen.getByRole("img", { name: "Thumbnail unavailable for Software Development video 1" })).toBeTruthy();
    expect(screen.getByText("Video preview unavailable")).toBeTruthy();
  });
});
