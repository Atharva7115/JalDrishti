import { Router } from "express";
import { getDistrictsList, getDistrictDetails } from "../controllers/district.controller.js";

const router = Router();

router.get("/", getDistrictsList);
router.get("/:district", getDistrictDetails);

export default router;
