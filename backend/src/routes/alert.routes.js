import { Router } from "express";
import {
  getAlerts,
  getAlertStats,
  getAlertById,
  getAlertsByStation,
  runAlertDetection,
  patchAcknowledgeAlert
} from "../controllers/alert.controller.js";

const router = Router();

router.get("/", getAlerts);
router.get("/stats", getAlertStats);
router.get("/:id", getAlertById);
router.get("/station/:stationId", getAlertsByStation);
router.post("/run", runAlertDetection);
router.patch("/:id/acknowledge", patchAcknowledgeAlert);
router.patch("/:id/resolve", patchAcknowledgeAlert);

export default router;
