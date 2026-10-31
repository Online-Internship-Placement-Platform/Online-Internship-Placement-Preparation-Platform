import { describe, expect, it } from "vitest";
import { parseYouTubeVideoId, validateRecommendedVideoInput } from "@/modules/recommended-videos/recommended-video-validation";

describe("recommended video input validation", () => {
  it.each([
    ["BgLTDT03QtU", "BgLTDT03QtU"],
    ["https://www.youtube.com/watch?v=KLlXCFG5TnA", "KLlXCFG5TnA"],
    ["https://youtu.be/WTzjTskDFMg", "WTzjTskDFMg"],
    ["https://youtube.com/shorts/AmdcTuEJ5o4", "AmdcTuEJ5o4"],
    ["https://www.youtube.com/embed/iifXCRd3FyA", "iifXCRd3FyA"],
  ])("extracts a video ID from %s", (input, expected) => {
    expect(parseYouTubeVideoId(input)).toBe(expected);
  });

  it.each([
    "https://example.com/watch?v=BgLTDT03QtU",
    "http://youtube.com/watch?v=BgLTDT03QtU",
    "https://youtube.com.evil.example/watch?v=BgLTDT03QtU",
    "https://youtube.com/watch?v=too-short",
    "javascript:alert(1)",
  ])("rejects untrusted or malformed URL %s", (input) => {
    expect(parseYouTubeVideoId(input)).toBeNull();
  });

  it("validates the complete management payload and returns a normalized video ID", () => {
    expect(validateRecommendedVideoInput({
      title: " Interview prep ",
      youtubeUrl: "https://youtu.be/BgLTDT03QtU",
      channelName: "Channel",
      description: "A short description.",
      category: "Software Development",
      thumbnailUrl: "https://attacker.example/image.jpg",
    })).toEqual({
      ok: true,
      data: {
        title: "Interview prep",
        youtubeId: "BgLTDT03QtU",
        channelName: "Channel",
        description: "A short description.",
        category: "Software Development",
      },
    });
  });

  it("rejects invalid categories and invalid YouTube inputs", () => {
    const valid = {
      title: "Title",
      youtubeUrl: "https://example.com/video",
      channelName: "Channel",
      description: "Description",
      category: "Other",
    };
    expect(validateRecommendedVideoInput(valid)).toMatchObject({ ok: false });
    expect(validateRecommendedVideoInput({ ...valid, youtubeUrl: "BgLTDT03QtU", category: "Software Development" })).toMatchObject({ ok: true });
  });
});
