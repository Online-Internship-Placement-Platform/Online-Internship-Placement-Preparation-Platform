// @vitest-environment node

import { afterEach, describe, expect, it } from "vitest";
import { deleteResume, isResumeStorageKey, readResume, storeResume, validateResume } from "@/lib/private-resume-storage";

const storedKeys: string[] = [];
const pdf = (name = "resume.pdf", type = "application/pdf", contents = "%PDF-1.7\nresume") => new File([contents], name, { type });
afterEach(async () => { await Promise.all(storedKeys.splice(0).map((key) => deleteResume(key))); });

describe("private resume storage validation", () => {
  it("validates non-empty PDF type, extension, size, and file signature", async () => {
    expect(await validateResume(new File([], "empty.pdf", { type: "application/pdf" }))).toBe("Choose a non-empty PDF file.");
    expect(await validateResume(new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.pdf", { type: "application/pdf" }))).toBe("Resume must be 5 MB or smaller.");
    expect(await validateResume(pdf("resume.txt", "text/plain"))).toBe("Resume must be a PDF file.");
    expect(await validateResume(pdf("resume.pdf", "application/pdf", "not a PDF"))).toBe("Resume must contain a valid PDF file.");
    expect(await validateResume(pdf("resume.PDF", "application/octet-stream"))).toBeNull();
  });

  it("stores and reads valid bytes, and rejects invalid content or storage keys", async () => {
    const file = pdf();
    const key = await storeResume(file);
    storedKeys.push(key);
    expect(isResumeStorageKey(key)).toBe(true);
    expect(await readResume(key)).toEqual(Buffer.from(await file.arrayBuffer()));
    await expect(storeResume(pdf("invalid.pdf", "application/pdf", "bad bytes"))).rejects.toThrow("Resume must contain a valid PDF file.");
    expect(isResumeStorageKey("../resume.pdf")).toBe(false);
    await expect(readResume("../resume.pdf")).rejects.toThrow("Invalid resume key.");
    await deleteResume("../resume.pdf");
  });

  it("treats deleting an already missing valid key as harmless", async () => {
    await expect(deleteResume("123e4567-e89b-12d3-a456-426614174000.pdf")).resolves.toBeUndefined();
  });
});
