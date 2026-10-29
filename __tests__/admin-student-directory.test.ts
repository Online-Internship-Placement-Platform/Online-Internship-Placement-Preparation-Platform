import { beforeEach, describe, expect, it, vi } from "vitest";

const getServerSession = vi.hoisted(() => vi.fn());
const userFindMany = vi.hoisted(() => vi.fn());

vi.mock("@/lib/server-session", () => ({ getServerSession }));
vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findMany: userFindMany } },
}));

import { GET } from "@/app/api/admin/students/route";

describe("GET /api/admin/students", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns student directory records for admin roles without exposing sensitive fields", async () => {
    getServerSession.mockResolvedValue({ userId: 7, role: "admin" });
    userFindMany.mockResolvedValue([
      {
        id: 11,
        name: "Aarav Mehta",
        email: "aarav@example.edu",
        passwordHash: "secret-hash",
        role: "STUDENT",
        studentProfile: {
          branch: "Computer Science",
          cgpa: 8.7,
          yearOfStudy: "THIRD",
          skills: ["React", "SQL"],
        },
      },
      {
        id: 12,
        name: "Ishita Shah",
        email: "ishita@example.edu",
        passwordHash: "another-secret",
        role: "STUDENT",
        studentProfile: null,
      },
    ]);

    const response = await GET(new Request("http://localhost/api/admin/students?name=Aarav"));

    
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      students: [
        {
          id: "11",
          name: "Aarav Mehta",
          email: "aarav@example.edu",
          branch: "Computer Science",
          cgpa: 8.7,
          yearOfStudy: 3,
          skills: ["React", "SQL"],
          avatar: "AM",
          resume: null,
        },
      ],
      total: 1,
    });

  });

  it("rejects non-admin access", async () => {
    getServerSession.mockResolvedValue({ userId: 5, role: "student" });

    const response = await GET(new Request("http://localhost/api/admin/students"));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Only administrators can view the student directory." });
  });
});
