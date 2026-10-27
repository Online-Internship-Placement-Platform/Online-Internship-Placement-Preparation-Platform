
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";

export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireRole(request, ["student", "admin"]);

    if (auth.response) return auth.response;

    const userId = auth.session!.userId;

    await prisma.user.delete({
      where: { id: userId },
    });

    const response = NextResponse.json({
      message: "Your account has been deleted successfully.",
    });

    response.cookies.delete("inplace-session");

    return response;
  } catch {
    return NextResponse.json(
      { error: "Unable to delete account." },
      { status: 500 }
    );
  }
}
