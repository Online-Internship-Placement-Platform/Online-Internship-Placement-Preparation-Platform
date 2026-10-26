import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/prisma/client";
import { demoAccounts } from "../src/modules/authentication/demo-account-seed";
import { hashPassword } from "../src/lib/password-hash";

const EXPECTED_DATABASE = "inplace";
const EXPECTED_PORT = 3306;
const ALLOWED_HOSTS = new Set(["127.0.0.1", "localhost"]);

class InitializationError extends Error {}

function validateOptInAndConfiguredTarget() {
  if (process.env.NODE_ENV === "production") {
    throw new InitializationError("Refusing to initialize demo passwords in production.");
  }
  if (process.env.ALLOW_DEMO_PASSWORD_INIT !== "true") {
    throw new InitializationError("Set ALLOW_DEMO_PASSWORD_INIT=true to explicitly initialize local demo passwords.");
  }

  const host = process.env.DATABASE_HOST ?? "localhost";
  const port = Number(process.env.DATABASE_PORT ?? EXPECTED_PORT);
  const database = process.env.DATABASE_NAME;
  if (!ALLOWED_HOSTS.has(host) || port !== EXPECTED_PORT || database !== EXPECTED_DATABASE) {
    throw new InitializationError("Refusing to initialize demo passwords: the configured database is not the expected local inplace database.");
  }
}

function databaseRole(role: (typeof demoAccounts)[number]["role"]) {
  switch (role) {
    case "STUDENT": return "student";
    case "ADMIN": return "admin";
    case "SUPER_ADMIN": return "super-admin";
  }
}

const target = {
  host: process.env.DATABASE_HOST ?? "localhost",
  port: Number(process.env.DATABASE_PORT ?? EXPECTED_PORT),
  database: process.env.DATABASE_NAME,
};
const prisma = new PrismaClient({
  adapter: new PrismaMariaDb({
    ...target,
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    connectionLimit: 1,
  }),
});

type DatabaseIdentity = { databaseName: string | null; port: number | bigint };

async function initializeMissingPasswords() {
  validateOptInAndConfiguredTarget();

  const [identity] = await prisma.$queryRaw<DatabaseIdentity[]>`
    SELECT DATABASE() AS databaseName, @@port AS port
  `;
  if (identity?.databaseName !== EXPECTED_DATABASE || Number(identity.port) !== EXPECTED_PORT) {
    throw new InitializationError("Refusing to initialize demo passwords: the connected database identity did not match the expected local target.");
  }

  // Validate every account before preparing or applying any update.
  const snapshots = await Promise.all(demoAccounts.map(async (account) => {
    const user = await prisma.user.findUnique({
      where: { email: account.email },
      select: { id: true, role: true, passwordHash: true },
    });
    if (!user) {
      throw new InitializationError(`Required demo account ${account.email} is missing; no passwords were initialized.`);
    }
    if (user.role !== account.role) {
      throw new InitializationError(`Demo account ${account.email} has a role mismatch; no passwords were initialized.`);
    }
    return { account, user };
  }));

  const pending: Array<{
    account: (typeof demoAccounts)[number];
    user: (typeof snapshots)[number]["user"];
    encodedHash: string;
  }> = [];
  for (const { account, user } of snapshots) {
    if (user.passwordHash === null) {
      pending.push({ account, user, encodedHash: await hashPassword(account.password) });
    }
  }

  const initialized: string[] = [];
  const alreadyInitialized = snapshots
    .filter(({ user }) => user.passwordHash !== null)
    .map(({ account }) => account.email);

  for (const { account, user, encodedHash } of pending) {
    // Raw SQL avoids Prisma's automatic @updatedAt change. The conditional
    // predicates prevent replacing a hash or updating an account whose role
    // changed after preflight. Only passwordHash is written.
    const updated = await prisma.$executeRaw`
      UPDATE \`User\`
      SET \`passwordHash\` = ${encodedHash}
      WHERE \`id\` = ${user.id}
        AND \`role\` = ${databaseRole(account.role)}
        AND \`passwordHash\` IS NULL
    `;

    if (updated === 1) {
      initialized.push(account.email);
      continue;
    }

    const current = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true, passwordHash: true },
    });
    if (current?.role === account.role && current.passwordHash !== null) {
      alreadyInitialized.push(account.email);
      continue;
    }
    throw new InitializationError(`Could not safely initialize ${account.email}; no existing hash was overwritten.`);
  }

  for (const email of initialized) console.info(`Initialized missing demo password hash for ${email}.`);
  for (const email of alreadyInitialized) console.info(`Kept existing demo password hash for ${email}.`);
  if (initialized.length === 0) console.info("No demo password hashes needed initialization.");
}

initializeMissingPasswords()
  .catch((error: unknown) => {
    if (error instanceof InitializationError) {
      console.error(error.message);
    } else {
      const errorCode = typeof error === "object" && error !== null && "code" in error
        ? String(error.code)
        : "unknown";
      console.error("Demo password initialization failed.", { errorCode });
    }
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
