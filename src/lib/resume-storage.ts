
import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";

const MAX_RESUME_SIZE = 5 * 1024 * 1024;
const RESUME_DIRECTORY = path.join(process.cwd(), "uploads", "resumes");

export class ResumeUploadError extends Error {}

export async function saveResume(file: File): Promise<string> {
  if (file.size === 0 || file.size > MAX_RESUME_SIZE) {
    throw new ResumeUploadError("Resume must be between 1 byte and 5 MB.");
  }

  if (
    file.type !== "application/pdf" ||
    !file.name.toLowerCase().endsWith(".pdf")
  ) {
    throw new ResumeUploadError("Resume must be a PDF file.");
  }

  const bytes = Buffer.from(await file.arrayBuffer());

  if (bytes.subarray(0, 5).toString("ascii") !== "%PDF-") {
    throw new ResumeUploadError("The uploaded file is not a valid PDF.");
  }

  await mkdir(RESUME_DIRECTORY, { recursive: true });

  const filename = `${randomUUID()}.pdf`;
  const relativePath = path.join("uploads", "resumes", filename);

  await writeFile(path.join(RESUME_DIRECTORY, filename), bytes, {
    flag: "wx",
  });

  return relativePath;
}

export async function deleteResume(relativePath: string): Promise<void> {
  if (
    path.dirname(relativePath) !== path.join("uploads", "resumes") ||
    path.basename(relativePath) === "." ||
    path.basename(relativePath) === ".."
  ) {
    return;
  }

  try {
    await unlink(
    path.join(process.cwd(), "uploads", "resumes", path.basename(relativePath))
    );
  } catch {
    // Cleanup should not hide the original registration error.
  }
}
