const MAX_RESUME_SIZE = 5 * 1024 * 1024;

export type ValidatedStudentResume = {
  resumeData: Uint8Array<ArrayBuffer>;
  resumeFileName: string;
};

export async function validateStudentResume(file: File): Promise<
  | { ok: true; resume: ValidatedStudentResume }
  | { ok: false; error: string }
> {
  if (file.size === 0) return { ok: false, error: "Choose a non-empty PDF file." };
  if (file.size > MAX_RESUME_SIZE) return { ok: false, error: "Resume must be 5 MB or smaller." };

  if (!file.name.toLowerCase().endsWith(".pdf")) {
    return { ok: false, error: "Resume must be a PDF file." };
  }
  const fileName = sanitizeResumeFilename(file.name);

  const resumeData = new Uint8Array(await file.arrayBuffer());
  if (resumeData.length < 5 || new TextDecoder().decode(resumeData.subarray(0, 5)) !== "%PDF-") {
    return { ok: false, error: "Resume must contain a valid PDF file." };
  }

  return { ok: true, resume: { resumeData, resumeFileName: fileName } };
}

export function sanitizeResumeFilename(value: string): string {
  const baseName = value.split(/[\\/]/).pop()?.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  const safeName = baseName || "resume.pdf";
  if (safeName.length <= 180) return safeName;
  return safeName.toLowerCase().endsWith(".pdf") ? `${safeName.slice(0, 176)}.pdf` : safeName.slice(0, 180);
}