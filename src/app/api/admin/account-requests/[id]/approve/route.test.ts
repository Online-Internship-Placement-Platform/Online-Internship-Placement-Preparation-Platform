
import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  findUser,
  findRequest,
  createUser,
  updateRequest,
  transaction,
  requireRole,
} = vi.hoisted(() => ({
  findUser: vi.fn(),
  findRequest: vi.fn(),
  createUser: vi.fn(),
  updateRequest: vi.fn(),
  transaction: vi.fn(),
  requireRole: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: findUser, create: createUser },
    accountCreationRequest: { findUnique: findRequest, update: updateRequest },
    $transaction: transaction,
  },
}));

vi.mock("@/lib/require-role", () => ({ requireRole }));

import { POST as approve } from "./route";
import { POST as reject } from "../reject/route";

const context = { params: Promise.resolve({ id: "1" }) };
const adminRequest = {
  id: 1,
  name: "Test Admin",
  email: "admin@example.com",
  passwordHash: "hashed",
  role: "ADMIN",
  status: "PENDING",
};

describe("Admin account request review", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireRole.mockResolvedValue({
      session: { userId: 99, email: "root@example.com", role: "super-admin" },
      response: null,
    });
    findRequest.mockResolvedValue(adminRequest);
    findUser.mockResolvedValue(null);
    createUser.mockResolvedValue({ id: 2 });
    updateRequest.mockResolvedValue({ ...adminRequest, status: "APPROVED" });
    transaction.mockImplementation(async (callback) =>
      callback({
        accountCreationRequest: { findUnique: findRequest, update: updateRequest },
        user: { findUnique: findUser, create: createUser },
      }),
    );
  });

  it("requires super-admin authorization", async () => {
    const denied = Response.json({ error: "Forbidden" }, { status: 403 });
    requireRole.mockResolvedValue({ session: null, response: denied });

    const response = await approve(
      new Request("http://localhost/api/admin/account-requests/1/approve", {
        method: "POST",
      }) as never,
      context,
    );

    expect(response.status).toBe(403);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("approves a pending admin request and creates the admin user", async () => {
    const response = await approve(
      new Request("http://localhost/api/admin/account-requests/1/approve", {
        method: "POST",
      }) as never,
      context,
    );

    expect(response.status).toBe(200);
    expect(createUser).toHaveBeenCalledWith({
      data: {
        name: adminRequest.name,
        email: adminRequest.email,
        passwordHash: adminRequest.passwordHash,
        role: "ADMIN",
      },
    });
    expect(updateRequest).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { status: "APPROVED" },
    });
  });

  it("does not approve a request that has already been reviewed", async () => {
    findRequest.mockResolvedValue({ ...adminRequest, status: "REJECTED" });

    const response = await approve(
      new Request("http://localhost/api/admin/account-requests/1/approve", {
        method: "POST",
      }) as never,
      context,
    );

    expect(response.status).toBe(409);
    expect(createUser).not.toHaveBeenCalled();
  });

  it("rejects a pending admin request", async () => {
    const response = await reject(
      new Request("http://localhost/api/admin/account-requests/1/reject", {
        method: "POST",
      }) as never,
      context,
    );

    expect(response.status).toBe(200);
    expect(updateRequest).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { status: "REJECTED" },
    });
  });
});
