
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


vi.mock("@/lib/resume-storage", () => ({
  saveResume: vi.fn().mockResolvedValue("uploads/resumes/test.pdf"),
  deleteResume: vi.fn().mockResolvedValue(undefined),
  ResumeUploadError: class ResumeUploadError extends Error {},
}));

import { saveResume } from "@/lib/resume-storage";


import { POST } from "./route";


function makeRequest(body: Record<string, unknown>): Request {
  const form = new FormData();

  for (const [key, value] of Object.entries(body)) {
    form.append(key, String(value));
  }

  return new Request("http://localhost/api/auth/register", {
    method: "POST",
    body: form,
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
    expect(saveResume).not.toHaveBeenCalled();
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

  
it("saves an uploaded PDF and stores its path in the student profile", async () => {
  const form = new FormData();

  for (const [key, value] of Object.entries(validStudent)) {
    form.append(key, value);
  }

  const pdf = new File(
    ["%PDF-1.4\nmock PDF content"],
    "resume.pdf",
    { type: "application/pdf" }
  );

  form.append("resume", pdf);

  vi.mocked(saveResume).mockResolvedValueOnce(
  "uploads/resumes/test.pdf"
 );

  const response = await POST(
    new Request("http://localhost/api/auth/register", {
      method: "POST",
      body: form,
    })
  );

  expect(response.status).toBe(201);
  expect(saveResume).toHaveBeenCalledWith(pdf);

  expect(createUser).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        studentProfile: {
          create: expect.objectContaining({
            resumePath: "uploads/resumes/test.pdf",
          }),
        },
      }),
    })
  );
});

it("rejects an oversized resume", async () => {
  const { ResumeUploadError } = await import("@/lib/resume-storage");

  vi.mocked(saveResume).mockRejectedValueOnce(
    new ResumeUploadError("Resume must be between 1 byte and 5 MB.")
  );

  const form = new FormData();

  for (const [key, value] of Object.entries(validStudent)) {
    form.append(key, value);
  }

  form.append(
    "resume",
    new File(["mock PDF"], "resume.pdf", { type: "application/pdf" })
  );

  
  
  const response = await POST(
    new Request("http://localhost/api/auth/register", {
      method: "POST",
      body: form,
    })
  );

  expect(response.status).toBe(400);
  expect(createUser).not.toHaveBeenCalled();
});




});
