import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/prisma/client";

const adapter = new PrismaMariaDb({
  host: process.env.DATABASE_HOST ?? "localhost",
  port: Number(process.env.DATABASE_PORT ?? 3306),
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
  connectionLimit: 5,
});
const prisma = new PrismaClient({ adapter });

const internships = [
  { id: "int-001", company: "Northstar Labs", role: "Frontend Engineering Intern", applicationDeadline: "2026-11-08", minCgpa: 7.5, eligibleBranches: ["Computer Science", "Information Technology"], requiredSkills: ["React", "TypeScript", "CSS"] },
  { id: "int-002", company: "Aster Finance", role: "Data Analyst Intern", applicationDeadline: "2026-10-28", minCgpa: 8, eligibleBranches: ["Computer Science", "Information Technology", "Statistics"], requiredSkills: ["SQL", "Python", "Excel"] },
  { id: "int-003", company: "Studio Kora", role: "Product Design Intern", applicationDeadline: "2026-11-18", minCgpa: 7, eligibleBranches: ["Any branch"], requiredSkills: ["Figma", "Research", "Prototyping"] },
  { id: "int-004", company: "Cloudline Systems", role: "Backend Developer Intern", applicationDeadline: "2026-10-20", minCgpa: 8.5, eligibleBranches: ["Computer Science", "Information Technology"], requiredSkills: ["Node.js", "PostgreSQL", "REST APIs"] },
  { id: "int-005", company: "GreenGrid Energy", role: "Business Strategy Intern", applicationDeadline: "2026-09-30", minCgpa: 7.5, eligibleBranches: ["Any branch"], requiredSkills: ["Research", "Excel", "Communication"] },
];

async function main() {
  const studentSkills = ["React", "TypeScript", "SQL", "Figma"];
  await prisma.user.upsert({
    where: { email: "student@gmail.com" },
    update: { name: "Aarav Mehta", role: "student", branch: "Computer Science", cgpa: 8.6, year: 3, skills: studentSkills.join("\n") },
    create: { email: "student@gmail.com", name: "Aarav Mehta", role: "student", branch: "Computer Science", cgpa: 8.6, year: 3, skills: studentSkills.join("\n") },
  });

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
