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

  const users = await prisma.user.findMany({
    where: {
      id: { not: req.user!.userId },
      OR: [
        { name: { contains: q } },
        { email: { contains: q.toLowerCase() } },
      ],
    },
    select: { id: true, name: true, email: true },
    take: 20,
  });

  res.json({ users });
});

export default router;
