import { Router, Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/prisma";
import { signToken } from "../lib/jwt";
import { getEmailValidationError } from "../lib/email";
import { ensurePublicChannels, joinUserToPublicChannels } from "../lib/defaults";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();

router.post("/register", async (req, res: Response) => {
  const { email, password, name } = req.body as {
    email?: string;
    password?: string;
    name?: string;
  };

  if (!email?.trim() || !password || !name?.trim()) {
    res.status(400).json({ error: "Email, password, and name are required" });
    return;
  }

  if (password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }

  const emailError = getEmailValidationError(email);
  if (emailError) {
    res.status(400).json({ error: emailError });
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (existing) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: {
      email: email.trim().toLowerCase(),
      password: hashed,
      name: name.trim(),
    },
  });

  const publicChannels = await prisma.channel.findMany({ where: { isPrivate: false } });
  if (publicChannels.length === 0) {
    await ensurePublicChannels(user.id);
  }
  await joinUserToPublicChannels(user.id);

  const token = signToken({ userId: user.id, email: user.email });
  res.status(201).json({
    token,
    user: { id: user.id, email: user.email, name: user.name },
  });
});

router.post("/login", async (req, res: Response) => {
  const { email, password } = req.body as { email?: string; password?: string };

  if (!email?.trim() || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const user = await prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });

  if (!user || !(await bcrypt.compare(password, user.password))) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  await joinUserToPublicChannels(user.id);

  const token = signToken({ userId: user.id, email: user.email });
  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name },
  });
});

router.get("/me", authMiddleware, async (req: AuthRequest, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { id: true, email: true, name: true, createdAt: true },
  });

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({ user });
});

export default router;
