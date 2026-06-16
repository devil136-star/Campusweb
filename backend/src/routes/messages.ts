import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();

router.use(authMiddleware);

router.get("/:channelId", async (req: AuthRequest, res: Response) => {
  const { channelId } = req.params;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);
  const before = req.query.before as string | undefined;

  const membership = await prisma.channelMember.findUnique({
    where: {
      userId_channelId: {
        userId: req.user!.userId,
        channelId,
      },
    },
  });

  if (!membership) {
    res.status(403).json({ error: "You are not a member of this channel" });
    return;
  }

  const messages = await prisma.message.findMany({
    where: {
      channelId,
      ...(before ? { createdAt: { lt: new Date(before) } } : {}),
    },
    include: {
      user: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  res.json({ messages: messages.reverse() });
});

router.post("/:channelId", async (req: AuthRequest, res: Response) => {
  const { channelId } = req.params;
  const { content, attachmentUrl, attachmentType, attachmentName } = req.body as {
    content?: string;
    attachmentUrl?: string;
    attachmentType?: string;
    attachmentName?: string;
  };

  const hasContent = Boolean(content?.trim());
  const hasAttachment = Boolean(attachmentUrl);

  if (!hasContent && !hasAttachment) {
    res.status(400).json({ error: "Message content or attachment is required" });
    return;
  }

  const membership = await prisma.channelMember.findUnique({
    where: {
      userId_channelId: {
        userId: req.user!.userId,
        channelId,
      },
    },
  });

  if (!membership) {
    res.status(403).json({ error: "You are not a member of this channel" });
    return;
  }

  const message = await prisma.message.create({
    data: {
      content: content?.trim() ?? "",
      channelId,
      userId: req.user!.userId,
      attachmentUrl: attachmentUrl ?? null,
      attachmentType: attachmentType ?? null,
      attachmentName: attachmentName ?? null,
    },
    include: {
      user: { select: { id: true, name: true } },
    },
  });

  res.status(201).json({ message });
});

export default router;
