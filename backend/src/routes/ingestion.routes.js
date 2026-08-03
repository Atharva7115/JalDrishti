import express from "express";

import { startIngestion } from "../controllers/ingestion.controller.js";

const router = express.Router();

router.post("/start", startIngestion);

export default router;