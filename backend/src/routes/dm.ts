import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { getIO } from "../lib/io";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();

router.use(authMiddleware);

const messageInclude = {
  user: { select: { id: true, name: true } },
} as const;

async function findConversationBetween(userId1: string, userId2: string) {
  const conversations = await prisma.conversation.findMany({
    where: {
      participants: { some: { userId: userId1 } },
    },
    include: { participants: true },
  });

  return conversations.find(
    (c) =>
      c.participants.length === 2 &&
      c.participants.some((p) => p.userId === userId2)
  );
}

router.get("/", async (req: AuthRequest, res: Response) => {
  const userId = req.user!.userId;

  const participations = await prisma.conversationParticipant.findMany({
    where: { userId },
    include: {
      conversation: {
        include: {
          participants: {
            include: { user: { select: { id: true, name: true, email: true } } },
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            include: messageInclude,
          },
        },
      },
    },
    orderBy: { conversation: { updatedAt: "desc" } },
  });

  const conversations = participations.map((p) => {
    const other = p.conversation.participants.find((x) => x.userId !== userId);
    const lastMessage = p.conversation.messages[0] ?? null;
    return {
      id: p.conversation.id,
      otherUser: other?.user ?? null,
      lastMessage,
      updatedAt: p.conversation.updatedAt,
    };
  });

  res.json({ conversations });
});

router.post("/", async (req: AuthRequest, res: Response) => {
  const { userId: otherUserId } = req.body as { userId?: string };
  const userId = req.user!.userId;

  if (!otherUserId || otherUserId === userId) {
    res.status(400).json({ error: "Valid recipient user ID is required" });
    return;
  }

  const otherUser = await prisma.user.findUnique({ where: { id: otherUserId } });
  if (!otherUser) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  let conversation = await findConversationBetween(userId, otherUserId);

  if (!conversation) {
    conversation = await prisma.conversation.create({
      data: {
        participants: {
          create: [{ userId }, { userId: otherUserId }],
        },
      },
      include: { participants: true },
    });
  }

  res.status(201).json({
    conversation: {
      id: conversation.id,
      otherUser: { id: otherUser.id, name: otherUser.name, email: otherUser.email },
    },
  });
});

router.get("/:conversationId/messages", async (req: AuthRequest, res: Response) => {
  const { conversationId } = req.params;
  const userId = req.user!.userId;
  const limit = Math.min(parseInt(req.query.limit as string) || 50, 100);

  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });

  if (!participant) {
    res.status(403).json({ error: "Not a participant in this conversation" });
    return;
  }

  const messages = await prisma.directMessage.findMany({
    where: { conversationId },
    include: messageInclude,
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  res.json({ messages });
});

router.post("/:conversationId/messages", async (req: AuthRequest, res: Response) => {
  const { conversationId } = req.params;
  const userId = req.user!.userId;
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

  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId } },
  });

  if (!participant) {
    res.status(403).json({ error: "Not a participant in this conversation" });
    return;
  }

  const message = await prisma.directMessage.create({
    data: {
      conversationId,
      userId,
      content: content?.trim() ?? "",
      attachmentUrl: attachmentUrl ?? null,
      attachmentType: attachmentType ?? null,
      attachmentName: attachmentName ?? null,
    },
    include: messageInclude,
  });

  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  const participants = await prisma.conversationParticipant.findMany({
    where: { conversationId },
    select: { userId: true },
  });

  const socket = getIO();
  socket?.to(`dm:${conversationId}`).emit("new_dm_message", { message });
  for (const p of participants) {
    socket?.to(`user:${p.userId}`).emit("dm_updated", { conversationId });
  }

  res.status(201).json({ message });
});

export default router;
