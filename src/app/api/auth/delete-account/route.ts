
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession, clearServerSession } from "@/lib/server-session";

export async function DELETE() {
  const session = await getServerSession();

  if (!session) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  try {
    if (session.role === "super-admin") {
      await prisma.$transaction(async (tx) => {
        const superAdminCount = await tx.user.count({ where: { role: "SUPER_ADMIN" } });
        if (superAdminCount < 2) throw new Error("LAST_SUPER_ADMIN");

        await tx.user.delete({ where: { id: session.userId } });
      }, { isolationLevel: "Serializable" });
    } else {
      await prisma.user.delete({ where: { id: session.userId } });
    }

    await clearServerSession();

    return NextResponse.json({ message: "Account deleted successfully." });
  } catch (error) {
    if (error instanceof Error && error.message === "LAST_SUPER_ADMIN") {
      return NextResponse.json(
        { error: "Cannot delete - yours is the only super admin account currently existing." },
        { status: 403 },
      );
    }

    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2034") {
      return NextResponse.json(
        { error: "Account deletion conflicted with another change. Please try again." },
        { status: 409 },
      );
    }

    console.error("Account deletion failed.", error);
    return NextResponse.json({ error: "Unable to delete account." }, { status: 500 });
  }
}
