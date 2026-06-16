import { Router, Response } from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import { getPublicUploadUrl, upload } from "../lib/upload";

const router = Router();

router.use(authMiddleware);

router.post("/", upload.single("file"), (req: AuthRequest, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }

  res.status(201).json({
    attachment: {
      url: getPublicUploadUrl(req.file.filename),
      type: req.file.mimetype,
      name: req.file.originalname,
      size: req.file.size,
    },
  });
});

export default router;
