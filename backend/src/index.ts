import "dotenv/config";
import http from "http";
import path from "path";
import express from "express";
import cors from "cors";
import { Server } from "socket.io";
import { verifyToken } from "./lib/jwt";
import { prisma } from "./lib/prisma";
import { UPLOAD_DIR } from "./lib/upload";
import authRoutes from "./routes/auth";
import channelRoutes from "./routes/channels";
import messageRoutes from "./routes/messages";
import dmRoutes from "./routes/dm";
import userRoutes from "./routes/users";
import uploadRoutes from "./routes/upload";

const PORT = process.env.PORT ?? 4000;
const CLIENT_URLS = (process.env.CLIENT_URL ?? "http://localhost:3000")
  .split(",")
  .map((u) => u.trim());

function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  if (CLIENT_URLS.includes(origin)) return true;
  try {
    const { hostname } = new URL(origin);
    if (hostname.endsWith(".vercel.app")) return true;
  } catch {
    /* ignore malformed origin */
  }
  return false;
}

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: (origin, callback) => {
      callback(null, isAllowedOrigin(origin));
    },
    methods: ["GET", "POST"],
  },
});

app.use(
  cors({
    origin: (origin, callback) => {
      callback(null, isAllowedOrigin(origin));
    },
  })
);
app.use(express.json());
app.use("/uploads", express.static(UPLOAD_DIR));

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", service: "campusweb-api" });
});

app.use("/api/auth", authRoutes);
app.use("/api/channels", channelRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/dm", dmRoutes);
app.use("/api/users", userRoutes);
app.use("/api/upload", uploadRoutes);

io.use(async (socket, next) => {
  const token = socket.handshake.auth.token as string | undefined;
  if (!token) {
    next(new Error("Authentication required"));
    return;
  }

  try {
    const payload = verifyToken(token);
    socket.data.userId = payload.userId;
    next();
  } catch {
    next(new Error("Invalid token"));
  }
});

io.on("connection", (socket) => {
  const userId = socket.data.userId as string;
  socket.join(`user:${userId}`);

  socket.on("join_channel", async (channelId: string) => {
    const membership = await prisma.channelMember.findUnique({
      where: { userId_channelId: { userId, channelId } },
    });
    if (membership) {
      socket.join(`channel:${channelId}`);
    }
  });

  socket.on("leave_channel", (channelId: string) => {
    socket.leave(`channel:${channelId}`);
  });

  socket.on(
    "send_message",
    async (data: {
      channelId: string;
      content?: string;
      attachmentUrl?: string;
      attachmentType?: string;
      attachmentName?: string;
    }) => {
      const { channelId, content, attachmentUrl, attachmentType, attachmentName } = data;
      const hasContent = Boolean(content?.trim());
      const hasAttachment = Boolean(attachmentUrl);
      if (!channelId || (!hasContent && !hasAttachment)) return;

      const membership = await prisma.channelMember.findUnique({
        where: { userId_channelId: { userId, channelId } },
      });
      if (!membership) return;

      const message = await prisma.message.create({
        data: {
          content: content?.trim() ?? "",
          channelId,
          userId,
          attachmentUrl: attachmentUrl ?? null,
          attachmentType: attachmentType ?? null,
          attachmentName: attachmentName ?? null,
        },
        include: { user: { select: { id: true, name: true } } },
      });

      io.to(`channel:${channelId}`).emit("new_message", { message });
    }
  );

  socket.on("join_dm", async (conversationId: string) => {
    const participant = await prisma.conversationParticipant.findUnique({
      where: { conversationId_userId: { conversationId, userId } },
    });
    if (participant) {
      socket.join(`dm:${conversationId}`);
    }
  });

  socket.on("leave_dm", (conversationId: string) => {
    socket.leave(`dm:${conversationId}`);
  });

  socket.on(
    "send_dm",
    async (data: {
      conversationId: string;
      content?: string;
      attachmentUrl?: string;
      attachmentType?: string;
      attachmentName?: string;
    }) => {
      const { conversationId, content, attachmentUrl, attachmentType, attachmentName } = data;
      const hasContent = Boolean(content?.trim());
      const hasAttachment = Boolean(attachmentUrl);
      if (!conversationId || (!hasContent && !hasAttachment)) return;

      const participant = await prisma.conversationParticipant.findUnique({
        where: { conversationId_userId: { conversationId, userId } },
      });
      if (!participant) return;

      const message = await prisma.directMessage.create({
        data: {
          conversationId,
          userId,
          content: content?.trim() ?? "",
          attachmentUrl: attachmentUrl ?? null,
          attachmentType: attachmentType ?? null,
          attachmentName: attachmentName ?? null,
        },
        include: { user: { select: { id: true, name: true } } },
      });

      await prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() },
      });

      const participants = await prisma.conversationParticipant.findMany({
        where: { conversationId },
        select: { userId: true },
      });

      io.to(`dm:${conversationId}`).emit("new_dm_message", { message });
      for (const p of participants) {
        io.to(`user:${p.userId}`).emit("dm_updated", { conversationId });
      }
    }
  );
});

server.listen(PORT, () => {
  console.log(`CampusWeb API running on http://localhost:${PORT}`);
});
