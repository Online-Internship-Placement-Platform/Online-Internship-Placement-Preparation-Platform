
import { beforeEach, describe, expect, it, vi } from "vitest";

const { findUser, findRequest, createUser, createRequest, hashPassword } =
  vi.hoisted(() => ({
    findUser: vi.fn(),
    findRequest: vi.fn(),
    createUser: vi.fn(),
    createRequest: vi.fn(),
    hashPassword: vi.fn(),
  }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: findUser,
      create: createUser,
    },
    accountCreationRequest: {
      findUnique: findRequest,
      create: createRequest,
    },
  },
}));

vi.mock("bcrypt", () => ({
  default: {
    hash: hashPassword,
  },
}));

import { POST } from "./route";

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validStudent = {
  name: "Test Student",
  email: "student@example.com",
  password: "StrongPass123",
  accountType: "student",
  branch: "Computer Science",
  cgpa: "8.5",
  year: "2",
  skills: "Python, SQL",
};

const validAdmin = {
  name: "Test Admin",
  email: "admin@example.com",
  password: "StrongPass123",
  accountType: "admin",
};

describe("POST /api/auth/register", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    findUser.mockResolvedValue(null);
    findRequest.mockResolvedValue(null);
    hashPassword.mockResolvedValue("mocked-password-hash");
    createUser.mockResolvedValue({ id: 1 });
    createRequest.mockResolvedValue({ id: 1 });
  });

  it("returns 400 when required fields are missing", async () => {
    const response = await POST(
      makeRequest({ email: "student@example.com" })
    );

    expect(response.status).toBe(400);
    expect(findUser).not.toHaveBeenCalled();
  });

  it("returns 400 for malformed JSON", async () => {
    const request = new Request(
      "http://localhost/api/auth/register",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{invalid-json",
      }
    );

    const response = await POST(request);

    expect(response.status).toBe(400);
  });

  it("rejects public super-admin registration", async () => {
    const response = await POST(
      makeRequest({
        ...validStudent,
        accountType: "super-admin",
      })
    );

    expect(response.status).toBe(400);
    expect(createUser).not.toHaveBeenCalled();
    expect(createRequest).not.toHaveBeenCalled();
  });

  it("rejects passwords shorter than eight characters", async () => {
    const response = await POST(
      makeRequest({
        ...validStudent,
        password: "short",
      })
    );

    expect(response.status).toBe(400);
    expect(hashPassword).not.toHaveBeenCalled();
  });

  it("rejects an invalid CGPA", async () => {
    const response = await POST(
      makeRequest({
        ...validStudent,
        cgpa: "11",
      })
    );

    expect(response.status).toBe(400);
    expect(createUser).not.toHaveBeenCalled();
  });

  it("rejects a year outside 1–4", async () => {
    const response = await POST(
      makeRequest({
        ...validStudent,
        year: "5",
      })
    );

    expect(response.status).toBe(400);
    expect(createUser).not.toHaveBeenCalled();
  });

  it("returns 409 when the email already belongs to a user", async () => {
    findUser.mockResolvedValue({ id: 1 });

    const response = await POST(makeRequest(validStudent));

    expect(response.status).toBe(409);
    expect(createUser).not.toHaveBeenCalled();
  });

  it("returns 409 when an account request already exists", async () => {
    findRequest.mockResolvedValue({ id: 1 });

    const response = await POST(makeRequest(validAdmin));

    expect(response.status).toBe(409);
    expect(createRequest).not.toHaveBeenCalled();
  });

  it("creates a student with a hashed password and profile", async () => {
    const response = await POST(makeRequest(validStudent));
    const result = await response.json();

    expect(response.status).toBe(201);
    expect(result.message).toContain("Student account created");

    expect(hashPassword).toHaveBeenCalledWith(
      validStudent.password,
      12
    );

    expect(createUser).toHaveBeenCalledWith({
      data: {
        name: "Test Student",
        email: "student@example.com",
        passwordHash: "mocked-password-hash",
        role: "STUDENT",
        studentProfile: {
          create: {
            branch: "Computer Science",
            cgpa: 8.5,
            yearOfStudy: 2,
            skills: ["Python", "SQL"],
          },
        },
      },
    });
  });

  it("normalizes email addresses before checking and saving", async () => {
    await POST(
      makeRequest({
        ...validStudent,
        email: "  STUDENT@EXAMPLE.COM ",
      })
    );

    expect(findUser).toHaveBeenCalledWith({
      where: { email: "student@example.com" },
    });

    expect(createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "student@example.com",
        }),
      })
    );
  });

  it("creates an admin request with pending status", async () => {
    const response = await POST(makeRequest(validAdmin));
    const result = await response.json();

    expect(response.status).toBe(201);
    expect(result.message).toContain("approval request");

    expect(createRequest).toHaveBeenCalledWith({
      data: {
        name: "Test Admin",
        email: "admin@example.com",
        passwordHash: "mocked-password-hash",
        role: "ADMIN",
        status: "PENDING",
      },
    });

    expect(createUser).not.toHaveBeenCalled();
  });

  it("returns 409 when Prisma reports a unique constraint violation", async () => {
    createUser.mockRejectedValue({ code: "P2002" });

    const response = await POST(makeRequest(validStudent));

    expect(response.status).toBe(409);
  });
});
