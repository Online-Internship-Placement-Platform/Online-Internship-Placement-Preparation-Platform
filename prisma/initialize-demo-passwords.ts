import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/prisma/client";
import {
  demoAccounts,
  ensureDemoAccount,
  type DemoAccountStore,
} from "../src/modules/authentication/demo-account-seed";
import { verifyPassword } from "../src/lib/password-hash";

const EXPECTED_DATABASE = "inplace";
const EXPECTED_PORT = 3306;
const ALLOWED_HOSTS = new Set(["127.0.0.1", "localhost"]);

class InitializationError extends Error {}

function validateOptInAndConfiguredTarget() {
  if (process.env.NODE_ENV === "production") {
    throw new InitializationError("Refusing to initialize demo accounts in production.");
  }
  if (process.env.ALLOW_DEMO_PASSWORD_INIT !== "true") {
    throw new InitializationError("Set ALLOW_DEMO_PASSWORD_INIT=true to explicitly initialize local demo accounts.");
  }

  const host = process.env.DATABASE_HOST ?? "localhost";
  const port = Number(process.env.DATABASE_PORT ?? EXPECTED_PORT);
  const database = process.env.DATABASE_NAME;
  if (!ALLOWED_HOSTS.has(host) || port !== EXPECTED_PORT || database !== EXPECTED_DATABASE) {
    throw new InitializationError("Refusing to initialize demo accounts: the configured database is not the expected local inplace database.");
  }
}

function databaseRole(role: (typeof demoAccounts)[number]["role"]) {
  switch (role) {
    case "STUDENT": return "student";
    case "ADMIN": return "admin";
    case "SUPER_ADMIN": return "super-admin";
  }
}

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb({
    host: process.env.DATABASE_HOST ?? "localhost",
    port: Number(process.env.DATABASE_PORT ?? EXPECTED_PORT),
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    connectionLimit: 1,
    allowPublicKeyRetrieval: true,
  }),
});

const demoAccountStore: DemoAccountStore = {
  async findByEmail(email) {
    return prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        role: true,
        passwordHash: true,
        studentProfile: { select: { id: true } },
      },
    });
  },
  async createAccount(data) {
    await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        role: data.role,
        passwordHash: data.passwordHash,
        ...(data.studentProfile ? { studentProfile: { create: data.studentProfile } } : {}),
      },
    });
  },
  async updatePasswordHash(id, passwordHash, role, previousPasswordHash) {
    const result = previousPasswordHash === null
      ? await prisma.$executeRaw`
          UPDATE \`User\`
          SET \`passwordHash\` = ${passwordHash}
          WHERE \`id\` = ${id} AND \`role\` = ${databaseRole(role)} AND \`passwordHash\` IS NULL
        `
      : await prisma.$executeRaw`
          UPDATE \`User\`
          SET \`passwordHash\` = ${passwordHash}
          WHERE \`id\` = ${id} AND \`role\` = ${databaseRole(role)} AND \`passwordHash\` = ${previousPasswordHash}
        `;

    if (result === 1) return;
    const current = await prisma.user.findUnique({
      where: { id },
      select: { role: true, passwordHash: true },
    });
    if (current?.role === role && await verifyPassword(
      demoAccounts.find((account) => account.role === role)!.password,
      current.passwordHash,
    )) return;
    throw new InitializationError("A demo account changed during initialization; no unrelated account data was modified.");
  },
  async createStudentProfile(userId, profile) {
    await prisma.studentProfile.create({ data: { userId, ...profile } });
  },
};

async function initializeDemoAccounts() {
  validateOptInAndConfiguredTarget();

  const [identity] = await prisma.$queryRaw<Array<{ databaseName: string | null; port: number | bigint }>>`
    SELECT DATABASE() AS databaseName, @@port AS port
  `;
  if (identity?.databaseName !== EXPECTED_DATABASE || Number(identity.port) !== EXPECTED_PORT) {
    throw new InitializationError("Refusing to initialize demo accounts: the connected database identity did not match the expected local target.");
  }

  // Check every existing role before making any account or password changes.
  for (const account of demoAccounts) {
    const existing = await demoAccountStore.findByEmail(account.email);
    if (existing && existing.role !== account.role) {
      throw new InitializationError(`Demo account ${account.email} has a role mismatch; no accounts were initialized.`);
    }
  }

  for (const account of demoAccounts) {
    const result = await ensureDemoAccount(demoAccountStore, account);
    if (result === "role-mismatch") {
      throw new InitializationError(`Demo account ${account.email} has a role mismatch; no account data was changed.`);
    }
    if (result === "created") console.info(`Created missing demo account ${account.email}.`);
    else if (result === "completed") console.info(`Repaired demo authentication or completed missing profile data for ${account.email}.`);
    else console.info(`Kept existing demo account ${account.email}.`);
  }
}

initializeDemoAccounts()
  .catch((error: unknown) => {
    if (error instanceof InitializationError) {
      console.error(error.message);
    } else {
      const errorCode = typeof error === "object" && error !== null && "code" in error
        ? String(error.code)
        : "unknown";
      console.error("Demo account initialization failed.", { errorCode });
    }
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
