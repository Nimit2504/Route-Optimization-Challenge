import express from "express";
import upload from "../utils/multer.js";
import { uploadFile } from "../controllers/upload.controller.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

/**
 * @route POST /upload
 * @desc The Main Entry Point. Uploads your Excel file, runs optimization, and generates all Fleets and Trips automatically.
 * @header Authorization: Bearer <token>
 * @header Content-Type: multipart/form-data
 * @body { file: <Excel File>, companyId: <string>, days: <JSON string Array> }
 */
router.post(
  "/upload",
  requireAuth,
  upload.single("file"),
  uploadFile
);

export default router;
