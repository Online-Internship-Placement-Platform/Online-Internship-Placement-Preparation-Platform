
import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUser, deleteUser, countUsers, transaction, requireRole } =
  vi.hoisted(() => ({
    findUser: vi.fn(),
    deleteUser: vi.fn(),
    countUsers: vi.fn(),
    transaction: vi.fn(),
    requireRole: vi.fn(),
  }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: transaction,
  },
}));

vi.mock("@/lib/require-role", () => ({ requireRole }));

import { DELETE } from "./route";

const context = { params: Promise.resolve({ id: "2" }) };

function makeRequest() {
  return new Request("http://localhost/api/admin/users/2", {
    method: "DELETE",
  });
}

describe("DELETE /api/admin/users/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    requireRole.mockResolvedValue({
      session: { userId: 1, email: "root@example.com", role: "super-admin" },
      response: null,
    });

    findUser.mockResolvedValue({
      id: 2,
      email: "admin@example.com",
      role: "ADMIN",
    });
    countUsers.mockResolvedValue(2);
    deleteUser.mockResolvedValue({ id: 2 });

    transaction.mockImplementation(async (callback: (tx: unknown) => unknown) =>
      callback({
        user: {
          findUnique: findUser,
          count: countUsers,
          delete: deleteUser,
        },
      }),
    );
  });

  it("rejects unauthenticated or unauthorized requests", async () => {
    requireRole.mockResolvedValue({
      session: null,
      response: Response.json({ error: "Forbidden" }, { status: 403 }),
    });

    const response = await DELETE(makeRequest() as never, context);

    expect(response.status).toBe(403);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("deletes an existing ordinary account", async () => {
    const response = await DELETE(makeRequest() as never, context);

    expect(response.status).toBe(200);
    expect(deleteUser).toHaveBeenCalledWith({ where: { id: 2 } });
  });

  it("prevents deleting your own account", async () => {
    findUser.mockResolvedValue({
      id: 1,
      email: "root@example.com",
      role: "SUPER_ADMIN",
    });

    const response = await DELETE(
      new Request("http://localhost/api/admin/users/1", {
        method: "DELETE",
      }) as never,
      { params: Promise.resolve({ id: "1" }) },
    );

    expect(response.status).toBe(409);
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("prevents deleting the last super-admin", async () => {
    findUser.mockResolvedValue({
      id: 2,
      email: "another-root@example.com",
      role: "SUPER_ADMIN",
    });
    countUsers.mockResolvedValue(1);

    const response = await DELETE(makeRequest() as never, context);

    expect(response.status).toBe(409);
    expect(deleteUser).not.toHaveBeenCalled();
  });

  it("returns 404 for a missing account", async () => {
    findUser.mockResolvedValue(null);

    const response = await DELETE(makeRequest() as never, context);

    expect(response.status).toBe(404);
    expect(deleteUser).not.toHaveBeenCalled();
  });
});
