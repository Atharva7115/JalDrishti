import { ingestGroundwaterData } from "../services/ingestion.service.js";

import {
  startIngestionLock,
  releaseIngestionLock,
} from "../utils/ingestionLock.js";

export const startIngestion = async (req, res) => {
  if (!startIngestionLock()) {
    return res.status(409).json({
      success: false,
      message: "Ingestion is already running.",
    });
  }



  try {
    await ingestGroundwaterData();

    res.status(200).json({
      success: true,
      message: "Ingestion completed successfully.",
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  } finally {
    releaseIngestionLock();
  }
};