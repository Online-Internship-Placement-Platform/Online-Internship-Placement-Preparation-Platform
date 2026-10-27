import { NextResponse } from "next/server";
import { getDashboardRoute } from "@/lib/auth-shared";
import { authenticateUser, type LoginUser } from "./authentication";
import type { Role } from "@/lib/placement-data";

type LoginDependencies = {
  findUser: (email: string) => Promise<LoginUser | null>;
  setSession: (session: { userId: number; role: Role }) => Promise<void>;
};

export function createLoginHandler({ findUser, setSession }: LoginDependencies) {
  return async function POST(request: Request) {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Enter your email and password to continue." }, { status: 400 });
    }

    if (typeof body !== "object" || body === null) {
      return NextResponse.json({ error: "Enter your email and password to continue." }, { status: 400 });
    }
    const { email, password } = body as Record<string, unknown>;
    if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password || email.length > 255 || password.length > 1024) {
      return NextResponse.json({ error: "Enter a valid email and password to continue." }, { status: 400 });
    }

    try {
      const identity = await authenticateUser(email, password, findUser);
      if (!identity) return NextResponse.json({ error: "The email or password is incorrect." }, { status: 401 });

      await setSession({ userId: identity.userId, role: identity.role });
      return NextResponse.json({ role: identity.role, route: getDashboardRoute(identity.role) });
    } catch (error) {
      const errorCode = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "unknown";
      console.error("Login failed during account lookup or session creation.", { errorCode });
      return NextResponse.json({ error: "Sign in is temporarily unavailable. Please try again." }, { status: 503 });
    }
  };
}
