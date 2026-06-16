import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "./lib/prisma";

async function main() {
  const demoEmail = "demo@campus.edu";
  let demoUser = await prisma.user.findUnique({ where: { email: demoEmail } });

  if (!demoUser) {
    demoUser = await prisma.user.create({
      data: {
        email: demoEmail,
        password: await bcrypt.hash("demo123", 10),
        name: "Demo Student",
      },
    });
    console.log("Created demo user: demo@campus.edu / demo123");
  }

  const defaultChannels = [
    { name: "general", description: "Campus-wide announcements and chat" },
    { name: "study-help", description: "Ask questions and help each other study" },
    { name: "events", description: "Upcoming campus events and meetups" },
    { name: "lost-and-found", description: "Lost items and found reports" },
  ];

  for (const ch of defaultChannels) {
    const existing = await prisma.channel.findFirst({ where: { name: ch.name } });
    if (!existing) {
      await prisma.channel.create({
        data: {
          name: ch.name,
          description: ch.description,
          isPrivate: false,
          createdById: demoUser.id,
          members: { create: { userId: demoUser.id } },
        },
      });
      console.log(`Created channel: #${ch.name}`);
    }
  }

  console.log("Seed complete.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
