import { healthCheck } from "../services/health.service.js";

export const getHealthStatus = async (req, res) => {
  try {
    const data = await healthCheck();

    res.status(200).json(data);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};