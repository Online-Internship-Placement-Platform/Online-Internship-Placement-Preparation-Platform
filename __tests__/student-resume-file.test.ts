import { describe, expect, it } from "vitest";
import { sanitizeResumeFilename, validateStudentResume } from "@/modules/students/resume-file";

const pdf = (name: string, bytes: Uint8Array) => ({
  name,
  size: bytes.length,
  arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
}) as File;

describe("student resume validation", () => {
  it("rejects empty, oversized, non-PDF and malformed PDF uploads", async () => {
    expect(await validateStudentResume(pdf("empty.pdf", new Uint8Array()))).toEqual({ ok: false, error: "Choose a non-empty PDF file." });
    expect(await validateStudentResume(pdf("large.pdf", new Uint8Array(5 * 1024 * 1024 + 1)))).toEqual({ ok: false, error: "Resume must be 5 MB or smaller." });
    expect(await validateStudentResume(pdf("resume.doc", new TextEncoder().encode("text")))).toEqual({ ok: false, error: "Resume must be a PDF file." });
    expect(await validateStudentResume(pdf("broken.pdf", new TextEncoder().encode("plain text")))).toEqual({ ok: false, error: "Resume must contain a valid PDF file." });
  });

  it("accepts valid PDF bytes and sanitizes the stored filename", async () => {
    const valid = await validateStudentResume(pdf("folder\\Jordan\u0000 Resume.PDF", new TextEncoder().encode("%PDF-1.7")));
    expect(valid.ok).toBe(true);
    if (valid.ok) {
      expect(valid.resume.resumeFileName).toBe("Jordan Resume.PDF");
      expect(new TextDecoder().decode(valid.resume.resumeData)).toBe("%PDF-1.7");
    }
    expect(sanitizeResumeFilename("/tmp/" + "x".repeat(181) + ".PDF")).toHaveLength(180);
    expect(sanitizeResumeFilename("folder/" + "y".repeat(181) + ".doc")).toHaveLength(180);
    expect(sanitizeResumeFilename("folder/   ")).toBe("resume.pdf");
  });
});
