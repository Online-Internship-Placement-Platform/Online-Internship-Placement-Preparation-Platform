import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/lib/server-session";
import { sanitizeResumeFilename, validateStudentResume } from "@/modules/students/resume-file";

const privateHeaders = { "Cache-Control": "private, no-store" };

export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Sign in to access your resume." }, { status: 401 });
  if (session.role !== "student") return NextResponse.json({ error: "Resume not found." }, { status: 404 });

  try {
    const profile = await prisma.studentProfile.findUnique({
      where: { userId: session.userId },
      select: { resumeData: true, resumeFileName: true },
    });
    if (!profile?.resumeData) return NextResponse.json({ error: "Resume not found." }, { status: 404 });

    const fileName = sanitizeResumeFilename(profile.resumeFileName ?? "resume.pdf");
    const asciiFileName = fileName.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
    return new Response(new Uint8Array(profile.resumeData), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${asciiFileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        ...privateHeaders,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Could not read the student profile resume.", error);
    return NextResponse.json({ error: "Resume is unavailable." }, { status: 503, headers: privateHeaders });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Sign in to upload your resume." }, { status: 401 });
  if (session.role !== "student") return NextResponse.json({ error: "Only students can update a profile resume." }, { status: 403 });

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Choose a PDF resume file." }, { status: 400 });
  }

  const file = formData.get("resume");
  if (!(file instanceof File)) return NextResponse.json({ error: "Choose a PDF resume file." }, { status: 400 });

  const validation = await validateStudentResume(file);
  if (!validation.ok) return NextResponse.json({ error: validation.error }, { status: 400 });

  try {
    const result = await prisma.studentProfile.updateMany({
      where: { userId: session.userId },
      data: validation.resume,
    });
    if (result.count === 0) return NextResponse.json({ error: "Student profile not found." }, { status: 404 });

    return NextResponse.json({ resumeFileName: validation.resume.resumeFileName }, { headers: privateHeaders });
  } catch (error) {
    console.error("Could not save the student profile resume.", error);
    return NextResponse.json({ error: "Resume could not be saved. Please try again." }, { status: 503, headers: privateHeaders });
  }
}