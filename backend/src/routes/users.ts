import { Router, Response } from "express";
import { prisma } from "../lib/prisma";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();

router.use(authMiddleware);

router.get("/search", async (req: AuthRequest, res: Response) => {
  const q = (req.query.q as string)?.trim();
  if (!q || q.length < 2) {
    res.json({ users: [] });
    return;
  }

  const needle = `%${q.toLowerCase()}%`;
  const users = await prisma.$queryRaw<
    { id: string; name: string; email: string }[]
  >`
    SELECT id, name, email FROM User
    WHERE id != ${req.user!.userId}
      AND (LOWER(name) LIKE ${needle} OR LOWER(email) LIKE ${needle})
    LIMIT 20
  `;

  res.json({ users });
});

export default router;
