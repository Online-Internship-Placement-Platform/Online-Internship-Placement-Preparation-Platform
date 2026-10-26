import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/prisma/client";
import { demoAccounts, ensureDemoAccount, type DemoAccountStore } from "../src/modules/authentication/demo-account-seed";

const adapter = new PrismaMariaDb({
  host: process.env.DATABASE_HOST ?? "localhost",
  port: Number(process.env.DATABASE_PORT ?? 3306),
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  connectionLimit: 5,
});
const prisma = new PrismaClient({ adapter });

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
  async updatePasswordHash(id, passwordHash) {
    await prisma.user.update({ where: { id }, data: { passwordHash } });
  },
  async createStudentProfile(userId, profile) {
    await prisma.studentProfile.create({ data: { userId, ...profile } });
  },
};

const internships = [
  { id: "int-001", company: "Northstar Labs", role: "Frontend Engineering Intern", applicationDeadline: "2026-11-08", minCgpa: 7.5, eligibleBranches: ["Computer Science", "Information Technology"], requiredSkills: ["React", "TypeScript", "CSS"] },
  { id: "int-002", company: "Aster Finance", role: "Data Analyst Intern", applicationDeadline: "2026-10-28", minCgpa: 8, eligibleBranches: ["Computer Science", "Information Technology", "Statistics"], requiredSkills: ["SQL", "Python", "Excel"] },
  { id: "int-003", company: "Studio Kora", role: "Product Design Intern", applicationDeadline: "2026-11-18", minCgpa: 7, eligibleBranches: ["Any branch"], requiredSkills: ["Figma", "Research", "Prototyping"] },
  { id: "int-004", company: "Cloudline Systems", role: "Backend Developer Intern", applicationDeadline: "2026-10-20", minCgpa: 8.5, eligibleBranches: ["Computer Science", "Information Technology"], requiredSkills: ["Node.js", "PostgreSQL", "REST APIs"] },
  { id: "int-005", company: "GreenGrid Energy", role: "Business Strategy Intern", applicationDeadline: "2026-09-30", minCgpa: 7.5, eligibleBranches: ["Any branch"], requiredSkills: ["Research", "Excel", "Communication"] },
];

async function main() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Demo accounts cannot be seeded when NODE_ENV is production.");
  }
  if (process.env.ALLOW_DEMO_SEED !== "true") {
    throw new Error("Set ALLOW_DEMO_SEED=true to explicitly seed local demo accounts.");
  }

  for (const account of demoAccounts) {
    const result = await ensureDemoAccount(demoAccountStore, account);
    if (result === "role-mismatch") {
      console.warn(`Skipped ${account.email}: an account with a different role already exists.`);
    } else {
      console.info(`${result === "created" ? "Created" : result === "completed" ? "Completed missing demo data for" : "Kept existing"} ${account.email}.`);
    }
  }

  for (const internship of internships) {
    await prisma.internship.upsert({
      where: { id: internship.id },
      update: {
        company: internship.company,
        role: internship.role,
        applicationDeadline: new Date(`${internship.applicationDeadline}T00:00:00.000Z`),
        minCgpa: internship.minCgpa,
        eligibleBranches: internship.eligibleBranches.join("\n"),
        requiredSkills: internship.requiredSkills.join("\n"),
      },
      create: {
        ...internship,
        applicationDeadline: new Date(`${internship.applicationDeadline}T00:00:00.000Z`),
        eligibleBranches: internship.eligibleBranches.join("\n"),
        requiredSkills: internship.requiredSkills.join("\n"),
        published: true,
        acceptingApplications: true,
      },
    });
  }
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
