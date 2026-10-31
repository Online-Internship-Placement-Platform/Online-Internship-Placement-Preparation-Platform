"use client";

import { useEffect, useState, type FormEvent } from "react";
import { AppShell } from "@/components/app-shell";
import type { Role } from "@/lib/placement-data";
import {
  videoCategories,
  type RecommendedVideo,
  type VideoCategory,
} from "@/lib/recommended-videos";
import { parseYouTubeVideoId } from "@/modules/recommended-videos/recommended-video-validation";

type VideoForm = {
  title: string;
  youtubeUrl: string;
  channelName: string;
  description: string;
  category: VideoCategory;
};

const blankForm: VideoForm = {
  title: "",
  youtubeUrl: "",
  channelName: "",
  description: "",
  category: videoCategories[0],
};

type AdminRole = Extract<Role, "admin" | "super-admin">;

export default function AdminRecommendedVideosView({ role }: { role: AdminRole }) {
  const [videos, setVideos] = useState<RecommendedVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [reload, setReload] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<VideoForm>(blankForm);
  const previewId = parseYouTubeVideoId(form.youtubeUrl);

  useEffect(() => {
    let active = true;
    fetch("/api/super-admin/recommended-videos", { cache: "no-store" })
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

  function startEditing(video: RecommendedVideo) {
    setEditingId(video.id);
    setForm({
      title: video.title,
      youtubeUrl: video.watchUrl,
      channelName: video.channelName,
      description: video.description,
      category: video.category,
    });
    setError("");
    setSuccess("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function resetForm() {
    setEditingId(null);
    setForm(blankForm);
  }

  async function saveVideo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const endpoint = editingId
        ? `/api/super-admin/recommended-videos/${encodeURIComponent(editingId)}`
        : "/api/super-admin/recommended-videos";
      const response = await fetch(endpoint, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "The video could not be saved.");
      resetForm();
      setSuccess(editingId ? "Video updated." : "Video added.");
      setReload((value) => value + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The video could not be saved.");
    } finally {
      setBusy(false);
    }
  }

  async function deleteVideo(video: RecommendedVideo) {
    if (!window.confirm(`Delete “${video.title}” from recommended videos?`)) return;
    setBusy(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch(`/api/super-admin/recommended-videos/${encodeURIComponent(video.id)}`, { method: "DELETE" });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "The video could not be deleted.");
      if (editingId === video.id) resetForm();
      setSuccess("Video deleted.");
      setReload((value) => value + 1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The video could not be deleted.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell role={role} title="Recommended Videos" eyebrow="Content management">
      <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">Manage recommended videos</h2>
          <p className="mt-1 max-w-2xl text-sm text-[#6e786f]">Add and organize YouTube resources students can browse across all four domains.</p>
        </div>
        {!editingId && <button type="button" onClick={() => { setError(""); document.getElementById("video-form-title")?.focus(); }} className="rounded-lg bg-[#176b50] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#12563f]">Add video</button>}
      </div>

      {error && <div role="alert" className="mb-4 rounded-lg bg-[#fff8f7] p-4 text-sm text-[#b94b48]">{error}</div>}
      {success && <p role="status" className="mb-4 rounded-lg bg-[#e6f2ec] p-4 text-sm text-[#176b50]">{success}</p>}

      <form onSubmit={saveVideo} className="mb-7 rounded-xl border border-[#e2e7e1] bg-white p-5">
        <h3 id="video-form-title" tabIndex={-1} className="mb-4 text-sm font-semibold">{editingId ? "Edit video" : "Add a video"}</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="text-xs font-semibold text-[#526057]">Video title
            <input required maxLength={191} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} className="mt-1.5 w-full rounded-lg border border-[#dfe5df] bg-[#fafbf9] px-3 py-2.5 text-sm font-normal outline-none focus:border-[#176b50]" />
          </label>
          <label className="text-xs font-semibold text-[#526057]">YouTube URL or video ID
            <input required maxLength={500} value={form.youtubeUrl} onChange={(event) => setForm({ ...form, youtubeUrl: event.target.value })} placeholder="https://www.youtube.com/watch?v=…" className="mt-1.5 w-full rounded-lg border border-[#dfe5df] bg-[#fafbf9] px-3 py-2.5 text-sm font-normal outline-none focus:border-[#176b50]" />
          </label>
          <label className="text-xs font-semibold text-[#526057]">Channel name
            <input required maxLength={191} value={form.channelName} onChange={(event) => setForm({ ...form, channelName: event.target.value })} className="mt-1.5 w-full rounded-lg border border-[#dfe5df] bg-[#fafbf9] px-3 py-2.5 text-sm font-normal outline-none focus:border-[#176b50]" />
          </label>
          <label className="text-xs font-semibold text-[#526057]">Domain
            <select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as VideoCategory })} className="mt-1.5 w-full rounded-lg border border-[#dfe5df] bg-[#fafbf9] px-3 py-2.5 text-sm font-normal outline-none focus:border-[#176b50]">
              {videoCategories.map((category) => <option key={category}>{category}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-[#526057] md:col-span-2">Short description
            <textarea required maxLength={2000} rows={3} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} className="mt-1.5 w-full rounded-lg border border-[#dfe5df] bg-[#fafbf9] px-3 py-2.5 text-sm font-normal outline-none focus:border-[#176b50]" />
          </label>
        </div>
        {previewId && <div className="mt-4 flex items-center gap-3 text-xs text-[#6e786f]">
          {/* YouTube thumbnail URLs are derived only from a validated video ID. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`https://img.youtube.com/vi/${previewId}/hqdefault.jpg`} alt="YouTube thumbnail preview" className="h-16 w-28 rounded-md bg-[#edf0eb] object-cover" />
          Thumbnail preview
        </div>}
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="submit" disabled={busy} className="rounded-lg bg-[#176b50] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#12563f] disabled:opacity-60">{busy ? "Saving…" : editingId ? "Save changes" : "Save video"}</button>
          {editingId && <button type="button" disabled={busy} onClick={resetForm} className="rounded-lg border border-[#e2e7e1] px-4 py-2.5 text-sm font-semibold text-[#657067] hover:bg-[#f0f3ef]">Cancel</button>}
        </div>
      </form>

      <div className="overflow-hidden rounded-xl border border-[#e2e7e1] bg-white">
        {loading ? <p role="status" className="p-8 text-center text-sm text-[#6e786f]">Loading videos…</p> : videos.length === 0 ? <p className="p-8 text-center text-sm text-[#6e786f]">No recommended videos are available yet.</p> : (
          <div role="region" aria-label="Recommended video records" tabIndex={0} className="max-h-[60vh] overflow-auto overscroll-contain focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#176b50] lg:max-h-[min(65vh,calc(100vh-18rem))]">
            <table className="w-full min-w-[720px] text-left">
              <thead className="border-b border-[#edf0ec] bg-[#fafbf9] text-[10px] uppercase tracking-[0.12em] text-[#89948b]"><tr><th className="px-5 py-3 font-semibold">Video</th><th className="px-5 py-3 font-semibold">Domain</th><th className="px-5 py-3 font-semibold">Channel</th><th className="px-5 py-3 font-semibold">Actions</th></tr></thead>
              <tbody>{videos.map((video) => <tr key={video.id} className="border-b border-[#edf0ec] last:border-0">
                <td className="px-5 py-4"><div className="text-sm font-semibold">{video.title}</div><div className="mt-1 max-w-md text-xs text-[#7b857c]">{video.description}</div></td>
                <td className="px-5 py-4 text-xs text-[#5e6b61]">{video.category}</td>
                <td className="px-5 py-4 text-xs text-[#5e6b61]">{video.channelName}</td>
                <td className="px-5 py-4"><div className="flex gap-3 text-xs font-semibold"><button type="button" disabled={busy} onClick={() => startEditing(video)} className="text-[#176b50] hover:underline disabled:opacity-50">Edit</button><button type="button" disabled={busy} onClick={() => void deleteVideo(video)} className="text-[#b94b48] hover:underline disabled:opacity-50">Delete</button></div></td>
              </tr>)}</tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  );
}
