"use client";

import { useEffect, useMemo, useState } from "react";
import {
  videoCategories,
  type RecommendedVideo,
  type VideoCategory,
} from "@/lib/recommended-videos";

function VideoCard({ video }: { video: RecommendedVideo }) {
  const [thumbnailUnavailable, setThumbnailUnavailable] = useState(false);

  return (
    <article className="overflow-hidden rounded-xl border border-[#e2e7e1] bg-white">
      <div className="relative aspect-video bg-[#edf0eb]">
        {thumbnailUnavailable ? (
          <div className="flex h-full items-center justify-center text-sm font-medium text-[#7b857c]" role="img" aria-label={`Thumbnail unavailable for ${video.title}`}>
            Video preview unavailable
          </div>
        ) : (
          // YouTube's thumbnail host varies and these images are intentionally unoptimized.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={video.thumbnailUrl}
            alt={`Thumbnail for ${video.title}`}
            loading="lazy"
            className="h-full w-full object-cover"
            onError={() => setThumbnailUnavailable(true)}
          />
        )}
      </div>
      <div className="p-5">
        <h3 className="line-clamp-2 text-sm font-semibold leading-5">{video.title}</h3>
        <p className="mt-2 text-xs font-medium text-[#176b50]">{video.channelName}</p>
        <p className="mt-3 line-clamp-3 text-sm leading-5 text-[#6e786f]">{video.description}</p>
        <a
          href={video.watchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex rounded-lg bg-[#176b50] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#12563f]"
        >
          Watch Video<span className="sr-only">: {video.title} (opens in a new tab)</span>
        </a>
      </div>
    </article>
  );
}

export function RecommendedVideosView() {
  const [selectedCategory, setSelectedCategory] = useState<VideoCategory | "All Videos">("All Videos");
  const [videos, setVideos] = useState<RecommendedVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const visibleCategories = videoCategories.filter(
    (category) => selectedCategory === "All Videos" || category === selectedCategory,
  );
  const videosByCategory = useMemo(
    () => new Map(videoCategories.map((category) => [category, videos.filter((video) => video.category === category)])),
    [videos],
  );

  useEffect(() => {
    let active = true;
    fetch("/api/recommended-videos", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json() as { videos?: RecommendedVideo[]; error?: string };
        if (!response.ok) throw new Error(result.error ?? "Could not load recommended videos.");
        if (active) setVideos(Array.isArray(result.videos) ? result.videos : []);
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "Could not load recommended videos.");
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [reload]);

  return (
    <>
      <p className="mb-6 max-w-2xl text-sm text-[#6e786f]">
        Explore hand-picked video resources to build skills and prepare for internships and placement interviews.
      </p>

      {error && <div role="alert" className="mb-5 flex items-center justify-between rounded-lg bg-[#fff8f7] p-4 text-sm text-[#b94b48]">{error}<button type="button" onClick={() => { setError(""); setLoading(true); setReload((value) => value + 1); }} className="ml-4 font-semibold underline">Retry</button></div>}

      <div className="mb-7 flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter videos by category">
        {(["All Videos", ...videoCategories] as const).map((category) => {
          const active = selectedCategory === category;
          return (
            <button
              key={category}
              type="button"
              onClick={() => setSelectedCategory(category)}
              aria-pressed={active}
              className={`shrink-0 rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${active ? "bg-[#176b50] text-white" : "border border-[#e2e7e1] bg-white text-[#657067] hover:bg-[#f0f3ef] hover:text-[#17211b]"}`}
            >
              {category}
            </button>
          );
        })}
      </div>

      <div className="space-y-8">
        {visibleCategories.map((category) => {
          const categoryVideos = videosByCategory.get(category) ?? [];
          return (
            <section key={category} aria-labelledby={`${category.replace(/[^a-z0-9]+/gi, "-")}-heading`}>
              <div className="mb-4 flex items-center justify-between">
                <h2 id={`${category.replace(/[^a-z0-9]+/gi, "-")}-heading`} className="text-base font-semibold">{category}</h2>
                <span className="text-xs text-[#7b857c]">{categoryVideos.length} videos</span>
              </div>
              {loading ? (
                <p role="status" className="rounded-xl border border-dashed border-[#dfe5df] bg-white p-5 text-sm text-[#6e786f]">Loading recommended videos…</p>
              ) : categoryVideos.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {categoryVideos.map((video) => <VideoCard key={video.id} video={video} />)}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed border-[#dfe5df] bg-white p-5 text-sm text-[#6e786f]">{error ? "Videos are unavailable right now." : "No videos available in this category."}</p>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}
