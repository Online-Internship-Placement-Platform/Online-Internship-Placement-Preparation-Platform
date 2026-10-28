// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUser, createUser, hashPassword } = vi.hoisted(() => ({
  findUser: vi.fn(),
  createUser: vi.fn(),
  hashPassword: vi.fn(),
}));

vi.mock("../src/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: findUser,
      create: createUser,
    },
  },
}));

vi.mock("../src/lib/password-hash", () => ({
  hashPassword,
}));

import { POST } from "../src/app/api/auth/register/route";

const student = {
  name: "Alex Sample",
  email: "alex.sample.test@example.com",
  password: "TestInPlace@2026",
  branch: "Computer Science",
  cgpa: "8.2",
  yearOfStudy: "THIRD",
  skills: "Python, SQL, Git",
};

function makeRequest(values: Record<string, string>) {
  const form = new FormData();

  Object.entries(values).forEach(([key, value]) => {
    form.set(key, value);
  });

  return new Request("http://localhost/api/auth/register", {
    method: "POST",
    body: form,
  });
}

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findUser.mockResolvedValue(null);
    hashPassword.mockResolvedValue("test-hash");
    createUser.mockResolvedValue({ id: 1 });
  });

  it("creates a student account", async () => {
    const response = await POST(makeRequest(student));

    expect(response.status).toBe(201);
    expect(createUser).toHaveBeenCalledOnce();
    expect(hashPassword).toHaveBeenCalledWith(student.password);
  });

  it("rejects an invalid email", async () => {
    const response = await POST(
      makeRequest({ ...student, email: "invalid-email" }),
    );

    expect(response.status).toBe(400);
    expect(createUser).not.toHaveBeenCalled();
  });

  it("rejects a short password", async () => {
    const response = await POST(
      makeRequest({ ...student, password: "short" }),
    );

    expect(response.status).toBe(400);
    expect(createUser).not.toHaveBeenCalled();
  });

  it("rejects duplicate emails", async () => {
    findUser.mockResolvedValue({ id: 2 });

    const response = await POST(makeRequest(student));

    expect(response.status).toBe(409);
    expect(createUser).not.toHaveBeenCalled();
  });

  it("rejects invalid academic years", async () => {
    const response = await POST(
      makeRequest({ ...student, yearOfStudy: "FIFTH" }),
    );

    expect(response.status).toBe(400);
    expect(createUser).not.toHaveBeenCalled();
  });

  it("rejects invalid CGPA", async () => {
    const response = await POST(
      makeRequest({ ...student, cgpa: "11" }),
    );

    expect(response.status).toBe(400);
    expect(createUser).not.toHaveBeenCalled();
  });
});