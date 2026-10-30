
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  userDelete: vi.fn(),
  requestFindUnique: vi.fn(),
  requestCreate: vi.fn(),
  requestFindMany: vi.fn(),
  requestUpdate: vi.fn(),
  requestUpdateMany: vi.fn(),
  transaction: vi.fn(),
  hashPassword: vi.fn(),
  getSession: vi.fn(),
  clearSession: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: mocks.userFindUnique,
      delete: mocks.userDelete,
    },
    accountCreationRequest: {
      findUnique: mocks.requestFindUnique,
      create: mocks.requestCreate,
      findMany: mocks.requestFindMany,
      update: mocks.requestUpdate,
      updateMany: mocks.requestUpdateMany,
    },
    $transaction: mocks.transaction,
  },
}));

vi.mock("@/lib/password-hash", () => ({
  hashPassword: mocks.hashPassword,
}));

vi.mock("@/lib/server-session", () => ({
  getServerSession: mocks.getSession,
  clearServerSession: mocks.clearSession,
}));

import { GET as checkAdminRequestStatus, PATCH as resubmitAdminRequest, POST as createAdminRequest } from "@/app/api/auth/account-requests/route";
import { DELETE as deleteAccount } from "@/app/api/auth/delete-account/route";
import { GET as listAdminRequests } from "@/app/api/admin/account-requests/route";
import { POST as approveRequest } from "@/app/api/admin/account-requests/[id]/approve/route";
import { POST as rejectRequest } from "@/app/api/admin/account-requests/[id]/reject/route";

const adminSession = { userId: 1, role: "super-admin" as const };
const studentSession = { userId: 2, role: "student" as const };

function jsonRequest(body: unknown) {
  return new Request("http://localhost/api/test", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const routeContext = (id: string) => ({
  params: Promise.resolve({ id }),
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.userFindUnique.mockResolvedValue(null);
  mocks.requestFindUnique.mockResolvedValue(null);
  mocks.requestCreate.mockResolvedValue({ id: 10 });
  mocks.hashPassword.mockResolvedValue("hashed-password");
  mocks.getSession.mockResolvedValue(adminSession);
  mocks.clearSession.mockResolvedValue(undefined);
  mocks.userDelete.mockResolvedValue({ id: 2 });
  mocks.requestFindMany.mockResolvedValue([]);
  mocks.requestUpdate.mockResolvedValue({});
  mocks.requestUpdateMany.mockResolvedValue({ count: 1 });
  mocks.transaction.mockImplementation(async (callback) =>
    callback({
      accountCreationRequest: {
        findUnique: mocks.requestFindUnique,
        update: mocks.requestUpdate,
      },
      user: { create: vi.fn().mockResolvedValue({ id: 10 }) },
    }),
  );
});

describe("Issue #9 — Admin account requests", () => {
  it("creates a pending admin request", async () => {
    const response = await createAdminRequest(
      jsonRequest({
        name: "Test Admin",
        email: "ADMIN@example.com",
        password: "StrongPass123",
      }),
    );

    expect(response.status).toBe(201);
    expect(mocks.requestCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: "Test Admin",
        email: "admin@example.com",
        passwordHash: "hashed-password",
        role: "ADMIN",
      }),
    });
  });

  it("rejects invalid email", async () => {
    const response = await createAdminRequest(
      jsonRequest({
        name: "Test Admin",
        email: "not-an-email",
        password: "StrongPass123",
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.requestCreate).not.toHaveBeenCalled();
  });

  it("rejects an existing user email", async () => {
    mocks.userFindUnique.mockResolvedValue({ id: 5 });

    const response = await createAdminRequest(
      jsonRequest({
        name: "Test Admin",
        email: "existing@example.com",
        password: "StrongPass123",
      }),
    );

    expect(response.status).toBe(409);
  });

  it("lists pending requests for super-admin", async () => {
    mocks.requestFindMany.mockResolvedValue([
      { id: 10, name: "Test Admin", email: "admin@example.com", createdAt: new Date() },
    ]);

    const response = await listAdminRequests();

    expect(response.status).toBe(200);
    expect(mocks.requestFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { role: "ADMIN", status: "PENDING" },
      }),
    );
  });

  it("blocks students from listing admin requests", async () => {
    mocks.getSession.mockResolvedValue(studentSession);

    const response = await listAdminRequests();

    expect(response.status).toBe(403);
    expect(mocks.requestFindMany).not.toHaveBeenCalled();
  });

  it("returns the status of an admin request by normalized email", async () => {
    const updatedAt = new Date("2026-10-28T12:00:00.000Z");
    mocks.requestFindUnique.mockResolvedValue({ status: "REJECTED", updatedAt });

    const response = await checkAdminRequestStatus(new Request("http://localhost/api/auth/account-requests?email=ADMIN%40example.com"));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ status: "REJECTED", updatedAt: updatedAt.toISOString() });
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(mocks.requestFindUnique).toHaveBeenCalledWith({
      where: { email: "admin@example.com" },
      select: { status: true, updatedAt: true },
    });
  });

  it("validates status lookup email and returns not found for unknown requests", async () => {
    const invalid = await checkAdminRequestStatus(new Request("http://localhost/api/auth/account-requests?email=invalid"));
    expect(invalid.status).toBe(400);

    mocks.requestFindUnique.mockResolvedValue(null);
    const missing = await checkAdminRequestStatus(new Request("http://localhost/api/auth/account-requests?email=none%40example.com"));
    expect(missing.status).toBe(404);
  });

  it("resubmits only a rejected admin request by setting it back to pending", async () => {
    const response = await resubmitAdminRequest(jsonRequest({ email: "ADMIN@example.com" }));

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ status: "PENDING" });
    expect(mocks.requestUpdateMany).toHaveBeenCalledWith({
      where: { email: "admin@example.com", role: "ADMIN", status: "REJECTED" },
      data: { status: "PENDING" },
    });
  });

  it("does not resubmit requests that are not rejected", async () => {
    mocks.requestUpdateMany.mockResolvedValue({ count: 0 });
    const response = await resubmitAdminRequest(jsonRequest({ email: "admin@example.com" }));

    expect(response.status).toBe(409);
  });
});

describe("Issue #10 — Account deletion", () => {
  it("deletes the signed-in student's account and clears session", async () => {
    mocks.getSession.mockResolvedValue(studentSession);

    const response = await deleteAccount();

    expect(response.status).toBe(200);
    expect(mocks.userDelete).toHaveBeenCalledWith({ where: { id: 2 } });
    expect(mocks.clearSession).toHaveBeenCalled();
  });

  it("rejects unauthenticated deletion", async () => {
    mocks.getSession.mockResolvedValue(null);

    const response = await deleteAccount();

    expect(response.status).toBe(401);
    expect(mocks.userDelete).not.toHaveBeenCalled();
  });

  it("protects super-admin from deletion", async () => {
    mocks.getSession.mockResolvedValue(adminSession);

    const response = await deleteAccount();

    expect(response.status).toBe(403);
    expect(mocks.userDelete).not.toHaveBeenCalled();
  });
});

describe("Issue #11 — Super-admin approval", () => {
  it("blocks a student from approving requests", async () => {
    mocks.getSession.mockResolvedValue(studentSession);

    const response = await approveRequest(
      new Request("http://localhost/api/test", { method: "POST" }),
      routeContext("10"),
    );

    expect(response.status).toBe(403);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects an invalid request ID", async () => {
    const response = await approveRequest(
      new Request("http://localhost/api/test", { method: "POST" }),
      routeContext("invalid"),
    );

    expect(response.status).toBe(400);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it("rejects a pending admin request", async () => {
    mocks.requestUpdateMany.mockResolvedValue({ count: 1 });

    const response = await rejectRequest(
      new Request("http://localhost/api/test", { method: "POST" }),
      routeContext("10"),
    );

    expect(response.status).toBe(200);
    expect(mocks.requestUpdateMany).toHaveBeenCalledWith({
      where: { id: 10, role: "ADMIN", status: "PENDING" },
      data: { status: "REJECTED" },
    });
  });

  it("returns not found when a request was already processed", async () => {
    mocks.requestUpdateMany.mockResolvedValue({ count: 0 });

    const response = await rejectRequest(
      new Request("http://localhost/api/test", { method: "POST" }),
      routeContext("10"),
    );

    expect(response.status).toBe(404);
  });
});
