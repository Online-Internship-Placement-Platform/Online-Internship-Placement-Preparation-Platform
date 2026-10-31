import { beforeEach, describe, expect, it, vi } from "vitest";

const getServerSession = vi.hoisted(() => vi.fn());
const createRecommendedVideo = vi.hoisted(() => vi.fn());
const listRecommendedVideos = vi.hoisted(() => vi.fn());
const updateRecommendedVideo = vi.hoisted(() => vi.fn());
const deleteRecommendedVideo = vi.hoisted(() => vi.fn());

vi.mock("@/lib/server-session", () => ({ getServerSession }));
vi.mock("@/modules/recommended-videos/recommended-video-service", () => ({
  createRecommendedVideo,
  deleteRecommendedVideo,
  isDuplicateRecommendedVideoError: (error: unknown) => typeof error === "object" && error !== null && "code" in error && error.code === "P2002",
  isMissingRecommendedVideoError: (error: unknown) => typeof error === "object" && error !== null && "code" in error && error.code === "P2025",
  listRecommendedVideos,
  updateRecommendedVideo,
}));

import { GET as getStudentVideos } from "@/app/api/recommended-videos/route";
import { GET as getManagementVideos, POST } from "@/app/api/super-admin/recommended-videos/route";
import { DELETE, PATCH } from "@/app/api/super-admin/recommended-videos/[videoId]/route";

const validVideo = {
  title: "Interview prep",
  youtubeUrl: "https://www.youtube.com/watch?v=BgLTDT03QtU",
  channelName: "Channel",
  description: "A short description.",
  category: "Software Development",
};

describe("recommended video APIs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listRecommendedVideos.mockResolvedValue([]);
    createRecommendedVideo.mockResolvedValue({ id: "video-1", ...validVideo, youtubeId: "BgLTDT03QtU" });
    updateRecommendedVideo.mockResolvedValue({ id: "video-1", ...validVideo, youtubeId: "BgLTDT03QtU" });
    deleteRecommendedVideo.mockResolvedValue(undefined);
  });

  it("lets a student read videos and rejects other roles from the student API", async () => {
    getServerSession.mockResolvedValue({ userId: 10, role: "student" });
    const response = await getStudentVideos();
    expect(response.status).toBe(200);

    getServerSession.mockResolvedValue({ userId: 11, role: "admin" });
    expect((await getStudentVideos()).status).toBe(403);
  });

  it("requires authentication and blocks students from video management APIs", async () => {
    getServerSession.mockResolvedValue(null);
    expect((await getManagementVideos()).status).toBe(401);
    expect((await POST(new Request("http://local/api/super-admin/recommended-videos", { method: "POST", body: JSON.stringify(validVideo) }))).status).toBe(401);

    getServerSession.mockResolvedValue({ userId: 11, role: "admin" });
    expect((await getManagementVideos()).status).toBe(200);
    expect((await POST(new Request("http://local/api/super-admin/recommended-videos", { method: "POST", body: JSON.stringify(validVideo) }))).status).toBe(201);
    createRecommendedVideo.mockClear();

    getServerSession.mockResolvedValue({ userId: 10, role: "student" });
    expect((await getManagementVideos()).status).toBe(403);
    expect((await POST(new Request("http://local/api/super-admin/recommended-videos", { method: "POST", body: JSON.stringify(validVideo) }))).status).toBe(403);
    const context = { params: Promise.resolve({ videoId: "video-1" }) };
    expect((await PATCH(new Request("http://local/api/super-admin/recommended-videos/video-1", { method: "PATCH", body: JSON.stringify(validVideo) }), context)).status).toBe(403);
    expect((await DELETE(new Request("http://local/api/super-admin/recommended-videos/video-1", { method: "DELETE" }), context)).status).toBe(403);
    expect(createRecommendedVideo).not.toHaveBeenCalled();
    expect(updateRecommendedVideo).not.toHaveBeenCalled();
    expect(deleteRecommendedVideo).not.toHaveBeenCalled();
  });

  it.each(["admin", "super-admin"] as const)("lets %s create, edit, and delete videos", async (role) => {
    getServerSession.mockResolvedValue({ userId: 12, role });
    const createResponse = await POST(new Request("http://local/api/super-admin/recommended-videos", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(validVideo),
    }));
    expect(createResponse.status).toBe(201);
    expect(createRecommendedVideo).toHaveBeenCalledWith({
      title: "Interview prep", youtubeId: "BgLTDT03QtU", channelName: "Channel",
      description: "A short description.", category: "Software Development",
    });

    const context = { params: Promise.resolve({ videoId: "video-1" }) };
    const patchResponse = await PATCH(new Request("http://local/api/super-admin/recommended-videos/video-1", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(validVideo),
    }), context);
    expect(patchResponse.status).toBe(200);
    expect(updateRecommendedVideo).toHaveBeenCalledWith("video-1", expect.objectContaining({ youtubeId: "BgLTDT03QtU" }));

    const deleteResponse = await DELETE(new Request("http://local/api/super-admin/recommended-videos/video-1", { method: "DELETE" }), context);
    expect(deleteResponse.status).toBe(200);
    expect(deleteRecommendedVideo).toHaveBeenCalledWith("video-1");
  });

  it("rejects invalid YouTube URLs before writing", async () => {
    getServerSession.mockResolvedValue({ userId: 12, role: "super-admin" });
    const response = await POST(new Request("http://local/api/super-admin/recommended-videos", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...validVideo, youtubeUrl: "https://attacker.example/video" }),
    }));
    expect(response.status).toBe(400);
    expect(createRecommendedVideo).not.toHaveBeenCalled();
  });
});
