import { prisma } from "@/lib/prisma";
import { setServerSession } from "@/lib/server-session";
import { createLoginHandler } from "@/modules/authentication/login-handler";

export const POST = createLoginHandler({
  findUser: async (email) => prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, passwordHash: true, role: true },
  }),
  setSession: setServerSession,
});
