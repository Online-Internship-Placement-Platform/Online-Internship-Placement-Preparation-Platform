
 // @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest";

const { getServerSession, findProfile, updateProfiles } = vi.hoisted(() => ({
  getServerSession: vi.fn(),
  findProfile: vi.fn(),
  updateProfiles: vi.fn(),
}));

vi.mock("@/lib/server-session", () => ({ getServerSession }));
vi.mock("@/lib/prisma", () => ({
  prisma: { studentProfile: { findUnique: findProfile, updateMany: updateProfiles } },
}));

import { GET, POST } from "@/app/api/profile/resume/route";


function resumeFile(
  name = "resume.pdf",
  content: string | Uint8Array = "%PDF-test",
  type = "application/pdf",
) {
  const fileContent: BlobPart =
    typeof content === "string" ? content : new Uint8Array(content).buffer;

  return new File([fileContent], name, { type });
}

function uploadRequest(file?: File) {
  const formData = new FormData();
  if (file) formData.set("resume", file);
  return new Request("http://localhost/api/profile/resume", {
    method: "POST",
    body: formData,
  });
}

describe("profile resume API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getServerSession.mockResolvedValue({ userId: 7, role: "student" });
    updateProfiles.mockResolvedValue({ count: 1 });
  });

  it("requires a signed-in student to upload a resume", async () => {
    getServerSession.mockResolvedValueOnce(null);
    const unauthenticated = await POST(uploadRequest(resumeFile()));
    expect(unauthenticated.status).toBe(401);

    getServerSession.mockResolvedValueOnce({ userId: 8, role: "admin" });
    const admin = await POST(uploadRequest(resumeFile()));
    expect(admin.status).toBe(403);
    expect(updateProfiles).not.toHaveBeenCalled();
  });

  it("saves validated PDF bytes and a sanitized filename for the session student", async () => {
    const response = await POST(uploadRequest(resumeFile("folder\\my-cv.pdf")));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ resumeFileName: "my-cv.pdf" });
    expect(updateProfiles).toHaveBeenCalledWith({
      where: { userId: 7 },
      data: expect.objectContaining({
        resumeFileName: "my-cv.pdf",
        resumeData: expect.any(Uint8Array),
      }),
    });
  });

  it.each([
    ["a non-PDF extension", resumeFile("resume.docx")],
    ["invalid PDF contents", resumeFile("resume.pdf", "not a PDF")],
    ["an empty file", resumeFile("resume.pdf", "")],
    ["an oversized file", resumeFile("resume.pdf", new Uint8Array(5 * 1024 * 1024 + 1))],
  ])("rejects %s without changing the saved resume", async (_description, file) => {
    const response = await POST(uploadRequest(file));
    expect(response.status).toBe(400);
    expect(updateProfiles).not.toHaveBeenCalled();
  });

  it("downloads only the signed-in student's resume as a private attachment", async () => {
    findProfile.mockResolvedValue({
      resumeData: new Uint8Array([37, 80, 68, 70, 45]),
      resumeFileName: "my-cv.pdf",
    });

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(response.headers.get("Content-Disposition")).toContain("attachment;");
    expect(response.headers.get("Content-Disposition")).toContain("my-cv.pdf");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([37, 80, 68, 70, 45]);
    expect(findProfile).toHaveBeenCalledWith({
      where: { userId: 7 },
      select: { resumeData: true, resumeFileName: true },
    });
  });

  it("does not allow administrator access to profile resumes", async () => {
    getServerSession.mockResolvedValue({ userId: 8, role: "admin" });
    const response = await GET();
    expect(response.status).toBe(404);
    expect(findProfile).not.toHaveBeenCalled();
  });
});
