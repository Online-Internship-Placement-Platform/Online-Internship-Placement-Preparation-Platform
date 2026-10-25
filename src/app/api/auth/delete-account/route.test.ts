
import { beforeEach, describe, expect, it, vi } from "vitest";

const { deleteUser, requireRole } = vi.hoisted(() => ({
  deleteUser: vi.fn(),
  requireRole: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      delete: deleteUser,
    },
  },
}));

vi.mock("@/lib/require-role", () => ({
  requireRole,
}));

import { DELETE } from "./route";

function makeRequest() {
  return new Request("http://localhost/api/auth/delete-account", {
    method: "DELETE",
  }) as never;
}

describe("DELETE /api/auth/delete-account", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireRole.mockResolvedValue({
      session: { userId: 5, email: "student@example.com", role: "student" },
      response: null,
    });
    deleteUser.mockResolvedValue({ id: 5 });
  });

  it("rejects unauthenticated requests", async () => {
    requireRole.mockResolvedValueOnce({
      session: null,
      response: Response.json({ error: "Unauthorized" }, { status: 401 }),
    });

    const response = await DELETE(makeRequest());

    expect(response.status).toBe(401);
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("deletes only the authenticated user's account", async () => {
    const response = await DELETE(makeRequest());

    expect(response.status).toBe(200);
    expect(deleteUser).toHaveBeenCalledWith({
      where: { id: 5 },
    });

    expect(await response.json()).toEqual({
      message: "Your account has been deleted successfully.",
    });

    expect(response.headers.get("set-cookie")).toContain("inplace-session=");
  });

  it("allows admins to delete their own account", async () => {
    requireRole.mockResolvedValueOnce({
      session: { userId: 8, email: "admin@example.com", role: "admin" },
      response: null,
    });

    const response = await DELETE(makeRequest());

    expect(response.status).toBe(200);
    expect(deleteUser).toHaveBeenCalledWith({ where: { id: 8 } });
  });

  it("returns an error if account deletion fails", async () => {
    deleteUser.mockRejectedValueOnce(new Error("Database error"));

    const response = await DELETE(makeRequest());

    expect(response.status).toBe(500);
  });
});
