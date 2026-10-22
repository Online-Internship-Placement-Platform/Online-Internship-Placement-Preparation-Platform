import "server-only";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";

const MAX_RESUME_SIZE = 5 * 1024 * 1024;
const RESUME_DIRECTORY = path.join(process.cwd(), "private_uploads", "resumes");

export async function validateResume(file: File): Promise<string | null> {
  if (file.size === 0) return "Choose a non-empty PDF file.";
  if (file.size > MAX_RESUME_SIZE) return "Resume must be 5 MB or smaller.";
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    return "Resume must be a PDF file.";
  }
  const header = Buffer.from(await file.slice(0, 5).arrayBuffer()).toString("ascii");
  if (header !== "%PDF-") return "Resume must contain a valid PDF file.";
  return null;
}

export async function storeResume(file: File): Promise<string> {
  const bytes = Buffer.from(await file.arrayBuffer());
  if (bytes.length < 5 || bytes.subarray(0, 5).toString("ascii") !== "%PDF-") {
    throw new Error("Resume must contain a valid PDF file.");
  }
  const key = `${randomUUID()}.pdf`;
  await mkdir(RESUME_DIRECTORY, { recursive: true });
  await writeFile(path.join(RESUME_DIRECTORY, key), bytes, { flag: "wx", mode: 0o600 });
  return key;
}

export function isResumeStorageKey(value: string): boolean {
  return /^[0-9a-f-]{36}\.pdf$/i.test(value);
}

export async function readResume(key: string): Promise<Buffer> {
  if (!isResumeStorageKey(key)) throw new Error("Invalid resume key.");
  return readFile(path.join(RESUME_DIRECTORY, key));
}

export async function deleteResume(key: string): Promise<void> {
  if (!isResumeStorageKey(key)) return;
  const { unlink } = await import("node:fs/promises");
  await unlink(path.join(RESUME_DIRECTORY, key)).catch(() => undefined);
}
