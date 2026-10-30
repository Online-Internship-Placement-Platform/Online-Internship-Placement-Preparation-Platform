import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/server-session";
import {
  createRecommendedVideo,
  isDuplicateRecommendedVideoError,
  listRecommendedVideos,
} from "@/modules/recommended-videos/recommended-video-service";
import { validateRecommendedVideoInput } from "@/modules/recommended-videos/recommended-video-validation";

async function authorize() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Sign in to manage recommended videos." }, { status: 401 });
  if (session.role !== "super-admin") return NextResponse.json({ error: "Super Admin access is required." }, { status: 403 });
  return null;
}

export async function GET() {
  const denial = await authorize();
  if (denial) return denial;

  try {
    return NextResponse.json(
      { videos: await listRecommendedVideos() },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    console.error("Could not load videos for Super Admin management.", error);
    return NextResponse.json({ error: "Recommended videos could not be loaded. Please try again." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const denial = await authorize();
  if (denial) return denial;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Provide valid video details." }, { status: 400 });
  }
  const result = validateRecommendedVideoInput(body);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });

  try {
    const video = await createRecommendedVideo(result.data);
    return NextResponse.json({ video }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (isDuplicateRecommendedVideoError(error)) {
      return NextResponse.json({ error: "That YouTube video is already in the recommendations." }, { status: 409 });
    }
    console.error("Could not create a recommended video.", error);
    return NextResponse.json({ error: "The video could not be saved. Please try again." }, { status: 503 });
  }
}
