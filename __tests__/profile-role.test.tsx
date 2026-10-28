import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/student/profile",
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));

const getServerSession = vi.hoisted(() => vi.fn());
const userFindUnique = vi.hoisted(() => vi.fn());
const userUpdate = vi.hoisted(() => vi.fn());
const studentProfileUpdate = vi.hoisted(() => vi.fn());
const transaction = vi.hoisted(() => vi.fn(async (operations: unknown[]) => Promise.all(operations)));

vi.mock("@/lib/server-session", () => ({
  getServerSession,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: userFindUnique, update: userUpdate },
    studentProfile: { update: studentProfileUpdate },
    $transaction: transaction,
  },
}));

import { GET, PATCH } from "@/app/api/profile/route";
import { ProfileView } from "@/components/profile-view";

describe("GET /api/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the authenticated student profile without exposing sensitive auth data", async () => {
    getServerSession.mockResolvedValue({ userId: 11, role: "student" });
    userFindUnique.mockResolvedValue({
      id: 11,
      role: "STUDENT",
      name: "Aarav Mehta",
      email: "aarav@example.edu",
      passwordHash: "secret-hash",
          studentProfile: { branch: "Computer Science", cgpa: 8.7, yearOfStudy: "THIRD", skills: ["React", "SQL"], resumeFileName: "cv.pdf" },
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      profile: {
        id: 11,
        name: "Aarav Mehta",
        email: "aarav@example.edu",
        role: "student",
        branch: "Computer Science",
        cgpa: 8.7,
        yearOfStudy: "THIRD",
        skills: ["React", "SQL"],
        resumeFileName: "cv.pdf",
      },
    });
  });

  it("returns only common profile fields for admin accounts", async () => {
    getServerSession.mockResolvedValue({ userId: 21, role: "admin" });
    userFindUnique.mockResolvedValue({
      id: 21,
      role: "ADMIN",
      name: "Priya Shah",
      email: "priya@inplace.edu",
      studentProfile: null,
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      profile: {
        id: 21,
        name: "Priya Shah",
        email: "priya@inplace.edu",
        role: "admin",
      },
    });
  });
});

describe("PATCH /api/profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects name and email edits for all accounts", async () => {
    getServerSession.mockResolvedValue({ userId: 11, role: "student" });

    const response = await PATCH(new Request("http://localhost/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Changed Name", email: "changed@example.edu" }),
    }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Name and email cannot be changed here." });
  });

  it("accepts valid student-specific updates and updates only the student profile fields", async () => {
    getServerSession.mockResolvedValue({ userId: 11, role: "student" });
    userFindUnique.mockResolvedValue({
      id: 11,
      role: "STUDENT",
      name: "Aarav Mehta",
      email: "aarav@example.edu",
      studentProfile: { userId: 11 },
    });
    userUpdate.mockResolvedValue({ id: 11, name: "Aarav Mehta" });
    studentProfileUpdate.mockResolvedValue({
      branch: "Data Science",
      cgpa: 9.1,
      yearOfStudy: "FOURTH",
      skills: ["SQL", "Python"],
      resumeFileName: null,
    });

    const response = await PATCH(new Request("http://localhost/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ branch: "Data Science", cgpa: 9.1, yearOfStudy: "FOURTH", skills: ["SQL", "Python"] }),
    }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      profile: {
        id: 11,
        name: "Aarav Mehta",
        role: "student",
        email: "aarav@example.edu",
        branch: "Data Science",
        cgpa: 9.1,
        yearOfStudy: "FOURTH",
        skills: ["SQL", "Python"],
        resumeFileName: null,
      },
    });
  });
});

describe("ProfileView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterAll(() => {
    vi.unstubAllGlobals();
  });

  it("renders the correct fields for student and admin accounts", async () => {
    const fetchMock = vi.mocked(globalThis.fetch);

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: { id: 11, name: "Aarav Mehta", role: "student" } }),
    } as Response);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        profile: {
          id: 11,
          name: "Aarav Mehta",
          email: "aarav@example.edu",
          role: "student",
          branch: "Computer Science",
          cgpa: 8.7,
          yearOfStudy: "THIRD",
          skills: ["React", "SQL"],
        },
      }),
    } as Response);

    const { unmount } = render(<ProfileView role="student" />);

    await waitFor(() => {
      expect(screen.getByText("Computer Science")).toBeDefined();
      expect(screen.getByText("Skills")).toBeDefined();
    });

    unmount();

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ user: { id: 21, name: "Priya Shah", role: "admin" } }),
    } as Response);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        profile: {
          id: 21,
          name: "Priya Shah",
          email: "priya@inplace.edu",
          role: "admin",
        },
      }),
    } as Response);

    render(<ProfileView role="admin" />);

    await waitFor(() => {
      expect(screen.getAllByText("Priya Shah").length).toBeGreaterThan(0);
      expect(screen.queryByText("Branch")).toBeNull();
    });
  });

  it("uploads a resume and updates its displayed filename", async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockImplementation(async (input) => {
      if (String(input) === "/api/auth/me") {
        return { ok: true, json: async () => ({ user: { id: 11, name: "Aarav Mehta", role: "student" } }) } as Response;
      }
      if (String(input) === "/api/profile/resume") {
        return { ok: true, json: async () => ({ resumeFileName: "updated-cv.pdf" }) } as Response;
      }
      return { ok: true, json: async () => ({ profile: {
        id: 11, name: "Aarav Mehta", email: "aarav@example.edu", role: "student",
        branch: "Computer Science", cgpa: 8.7, yearOfStudy: "THIRD", skills: [], resumeFileName: null,
      } }) } as Response;
    });

    render(<ProfileView role="student" />);
    const uploadInput = await screen.findByLabelText("Upload resume PDF");
    fireEvent.change(uploadInput, { target: { files: [new File(["%PDF-test"], "updated-cv.pdf", { type: "application/pdf" })] } });

    expect(await screen.findByText("updated-cv.pdf")).toBeDefined();
    expect(await screen.findByText("Resume uploaded successfully.")).toBeDefined();
    expect(fetchMock).toHaveBeenCalledWith("/api/profile/resume", expect.objectContaining({ method: "POST" }));
  });
});
