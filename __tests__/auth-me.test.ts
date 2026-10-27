import { beforeEach, describe, expect, it, vi } from "vitest";

const { clearServerSession, getServerSession, findUser } = vi.hoisted(() => ({
  clearServerSession: vi.fn(),
  getServerSession: vi.fn(),
  findUser: vi.fn(),
}));

vi.mock("@/lib/server-session", () => ({
  clearServerSession,
  getServerSession,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: findUser } },
}));

import { GET } from "@/app/api/auth/me/route";

describe("GET /api/auth/me", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ userId: 7, role: "student" });
    findUser.mockResolvedValue({ id: 7, name: "Alex Student" });
  });

  it("returns the database-backed identity for a valid cookie session", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await response.json()).toEqual({
      user: { id: 7, name: "Alex Student", role: "student" },
    });
    expect(findUser).toHaveBeenCalledWith({
      where: { id: 7 },
      select: { id: true, name: true },
    });
    expect(clearServerSession).not.toHaveBeenCalled();
  });

  it("rejects and clears a missing or invalid session", async () => {
    getServerSession.mockResolvedValueOnce(null);

    const response = await GET();

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "Unauthorized" });
    expect(clearServerSession).toHaveBeenCalledOnce();
    expect(findUser).not.toHaveBeenCalled();
  });

  it("clears a session whose user no longer exists", async () => {
    findUser.mockResolvedValueOnce(null);

    const response = await GET();

    expect(response.status).toBe(401);
    expect(clearServerSession).toHaveBeenCalledOnce();
  });
});