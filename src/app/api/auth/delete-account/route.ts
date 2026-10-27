
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession, clearServerSession } from "@/lib/server-session";

export async function DELETE() {
  const session = await getServerSession();

  if (!session) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  if (session.role === "super-admin") {
    return NextResponse.json(
      { error: "Super-admin accounts cannot be deleted." },
      { status: 403 },
    );
  }

  try {
    await prisma.user.delete({ where: { id: session.userId } });
    await clearServerSession();

    return NextResponse.json({ message: "Account deleted successfully." });
  } catch (error) {
    console.error("Account deletion failed.", error);
    return NextResponse.json({ error: "Unable to delete account." }, { status: 500 });
  }
}
