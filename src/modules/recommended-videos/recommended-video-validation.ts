import {
  videoCategories,
  type RecommendedVideoInput,
  type VideoCategory,
} from "@/lib/recommended-videos";

const youtubeIdPattern = /^[A-Za-z0-9_-]{11}$/;
const youtubeHosts = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "music.youtube.com"]);

export function parseYouTubeVideoId(input: string): string | null {
  const value = input.trim();
  if (youtubeIdPattern.test(value)) return value;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }

  if (url.protocol !== "https:" || url.username || url.password || url.port) return null;
  const host = url.hostname.toLowerCase();
  let videoId: string | null = null;

  if (host === "youtu.be" || host === "www.youtu.be") {
    const path = url.pathname.match(/^\/([A-Za-z0-9_-]{11})\/?$/);
    videoId = path?.[1] ?? null;
  } else if (youtubeHosts.has(host)) {
    if (url.pathname === "/watch") {
      videoId = url.searchParams.get("v");
    } else {
      const path = url.pathname.match(/^\/(?:embed|shorts|live)\/([A-Za-z0-9_-]{11})\/?$/);
      videoId = path?.[1] ?? null;
    }
  }

  return videoId && youtubeIdPattern.test(videoId) ? videoId : null;
}

export type VideoValidationResult =
  | { ok: true; data: RecommendedVideoInput }
  | { ok: false; error: string };

function readText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > maxLength || /[\u0000-\u001f\u007f]/.test(trimmed)) return null;
  return trimmed;
}

export function validateRecommendedVideoInput(value: unknown): VideoValidationResult {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { ok: false, error: "Provide valid video details." };
  }

  const fields = value as Record<string, unknown>;
  const title = readText(fields.title, 191);
  const channelName = readText(fields.channelName, 191);
  const description = readText(fields.description, 2000);
  const youtubeInput = readText(fields.youtubeUrl ?? fields.youtubeId, 500);
  const category = fields.category;

  if (!title) return { ok: false, error: "Enter a title of 1 to 191 characters." };
  if (!youtubeInput || !parseYouTubeVideoId(youtubeInput)) {
    return { ok: false, error: "Enter a valid YouTube video URL or 11-character video ID." };
  }
  if (!channelName) return { ok: false, error: "Enter a channel name of 1 to 191 characters." };
  if (!description) return { ok: false, error: "Enter a short description of up to 2,000 characters." };
  if (typeof category !== "string" || !videoCategories.includes(category as VideoCategory)) {
    return { ok: false, error: "Choose one of the available video domains." };
  }

  return {
    ok: true,
    data: { title, youtubeId: parseYouTubeVideoId(youtubeInput)!, channelName, description, category: category as VideoCategory },
  };
}
