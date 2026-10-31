import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/server-session";
import {
  deleteRecommendedVideo,
  isDuplicateRecommendedVideoError,
  isMissingRecommendedVideoError,
  updateRecommendedVideo,
} from "@/modules/recommended-videos/recommended-video-service";
import { validateRecommendedVideoInput } from "@/modules/recommended-videos/recommended-video-validation";

type RouteContext = { params: Promise<{ videoId: string }> };

async function authorize() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: "Sign in to manage recommended videos." }, { status: 401 });
  if (session.role !== "admin" && session.role !== "super-admin") return NextResponse.json({ error: "Admin access is required." }, { status: 403 });
  return null;
}

export async function PATCH(request: Request, { params }: RouteContext) {
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
    const { videoId } = await params;
    const video = await updateRecommendedVideo(videoId, result.data);
    return NextResponse.json({ video }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (isDuplicateRecommendedVideoError(error)) {
      return NextResponse.json({ error: "That YouTube video is already in the recommendations." }, { status: 409 });
    }
    if (isMissingRecommendedVideoError(error)) return NextResponse.json({ error: "Recommended video not found." }, { status: 404 });
    console.error("Could not update a recommended video.", error);
    return NextResponse.json({ error: "The video could not be updated. Please try again." }, { status: 503 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const denial = await authorize();
  if (denial) return denial;

  try {
    const { videoId } = await params;
    await deleteRecommendedVideo(videoId);
    return NextResponse.json({ deleted: true }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (isMissingRecommendedVideoError(error)) return NextResponse.json({ error: "Recommended video not found." }, { status: 404 });
    console.error("Could not delete a recommended video.", error);
    return NextResponse.json({ error: "The video could not be deleted. Please try again." }, { status: 503 });
  }
}
