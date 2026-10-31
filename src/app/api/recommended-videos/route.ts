import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/server-session";
import { listRecommendedVideos } from "@/modules/recommended-videos/recommended-video-service";

export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Sign in to view recommended videos." }, { status: 401 });
  if (session.role !== "student") return NextResponse.json({ error: "Only students can view recommended videos." }, { status: 403 });

  try {
    return NextResponse.json(
      { videos: await listRecommendedVideos() },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    console.error("Could not load recommended videos.", error);
    return NextResponse.json({ error: "Recommended videos are temporarily unavailable. Please try again." }, { status: 503 });
  }
}
