
import { prisma } from "./lib/prisma";

async function main() {
  const users = await prisma.user.findMany({
    include: {
      studentProfile: true,
    },
  });

  console.log("Users and student profiles:");
  console.log(JSON.stringify(users, null, 2));
}

main()
  .catch((error: unknown) => {
    console.error("Prisma test failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
