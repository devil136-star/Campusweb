import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();

router.use(authMiddleware);

router.get("/", async (req: AuthRequest, res: Response) => {
  const memberships = await prisma.channelMember.findMany({
    where: { userId: req.user!.userId },
    include: {
      channel: {
        include: {
          _count: { select: { members: true } },
        },
      },
    },
    orderBy: { channel: { name: "asc" } },
  });

  const channels = memberships.map((m) => ({
    id: m.channel.id,
    name: m.channel.name,
    description: m.channel.description,
    isPrivate: m.channel.isPrivate,
    memberCount: m.channel._count.members,
    joinedAt: m.joinedAt,
  }));

  res.json({ channels });
});

router.post("/", async (req: AuthRequest, res: Response) => {
  const { name, description, isPrivate } = req.body as {
    name?: string;
    description?: string;
    isPrivate?: boolean;
  };

  if (!name?.trim()) {
    res.status(400).json({ error: "Channel name is required" });
    return;
  }

  const channel = await prisma.channel.create({
    data: {
      name: name.trim().toLowerCase().replace(/\s+/g, "-"),
      description: description?.trim() || null,
      isPrivate: Boolean(isPrivate),
      createdById: req.user!.userId,
      members: {
        create: { userId: req.user!.userId },
      },
    },
  });

  res.status(201).json({ channel });
});

router.post("/:id/join", async (req: AuthRequest, res: Response) => {
  const channel = await prisma.channel.findUnique({ where: { id: req.params.id } });

  if (!channel) {
    res.status(404).json({ error: "Channel not found" });
    return;
  }

  if (channel.isPrivate) {
    res.status(403).json({ error: "This is a private channel" });
    return;
  }

  await prisma.channelMember.upsert({
    where: {
      userId_channelId: {
        userId: req.user!.userId,
        channelId: channel.id,
      },
    },
    create: {
      userId: req.user!.userId,
      channelId: channel.id,
    },
    update: {},
  });

  res.json({ success: true });
});

router.get("/discover", async (req: AuthRequest, res: Response) => {
  const joined = await prisma.channelMember.findMany({
    where: { userId: req.user!.userId },
    select: { channelId: true },
  });
  const joinedIds = joined.map((j) => j.channelId);

  const channels = await prisma.channel.findMany({
    where: {
      isPrivate: false,
      id: { notIn: joinedIds },
    },
    include: {
      _count: { select: { members: true } },
    },
    orderBy: { name: "asc" },
  });

  res.json({
    channels: channels.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      memberCount: c._count.members,
    })),
  });
});

export default router;
