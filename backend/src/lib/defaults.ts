import { prisma } from "./prisma";

const DEFAULT_CHANNELS = [
  { name: "general", description: "Campus-wide announcements and chat" },
  { name: "study-help", description: "Ask questions and help each other study" },
  { name: "events", description: "Upcoming campus events and meetups" },
];

export async function ensurePublicChannels(creatorUserId: string): Promise<void> {
  for (const ch of DEFAULT_CHANNELS) {
    const existing = await prisma.channel.findFirst({ where: { name: ch.name } });
    if (existing) continue;

    await prisma.channel.create({
      data: {
        name: ch.name,
        description: ch.description,
        isPrivate: false,
        createdById: creatorUserId,
        members: { create: { userId: creatorUserId } },
      },
    });
  }
}

export async function joinUserToPublicChannels(userId: string): Promise<void> {
  const publicChannels = await prisma.channel.findMany({
    where: { isPrivate: false },
    select: { id: true },
  });

  if (publicChannels.length === 0) return;

  await prisma.channelMember.createMany({
    data: publicChannels.map((channel) => ({ userId, channelId: channel.id })),
    skipDuplicates: true,
  });
}

/** Create default channels and backfill memberships for all users (e.g. after deploy). */
export async function ensureDefaults(): Promise<void> {
  const firstUser = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  if (!firstUser) return;

  await ensurePublicChannels(firstUser.id);

  const users = await prisma.user.findMany({ select: { id: true } });
  for (const user of users) {
    await joinUserToPublicChannels(user.id);
  }
}
