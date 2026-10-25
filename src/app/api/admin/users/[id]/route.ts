
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/require-role";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireRole(request, ["super-admin"]);
    if (auth.response) return auth.response;

    const { id: rawId } = await context.params;
    const id = Number(rawId);

    if (!Number.isSafeInteger(id) || id <= 0) {
      return NextResponse.json({ error: "Invalid user ID." }, { status: 400 });
    }

    const result = await prisma.$transaction(async (tx) => {
      const target = await tx.user.findUnique({ where: { id } });

      if (!target) {
        return { error: "User not found.", status: 404 };
      }

      if (target.id === auth.session!.userId) {
        return { error: "You cannot delete your own account.", status: 409 };
      }

      if (target.role === "SUPER_ADMIN") {
        const count = await tx.user.count({
          where: { role: "SUPER_ADMIN" },
        });

        if (count <= 1) {
          return {
            error: "Cannot delete the last super-admin account.",
            status: 409,
          };
        }
      }

      await tx.user.delete({ where: { id } });
      return { success: true };
    });

    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }

    return NextResponse.json(result);
  } catch {
    return NextResponse.json(
      { error: "Unable to delete account." },
      { status: 500 },
    );
  }
}
