import axios from "axios";

const ML_BASE_URL = process.env.ML_BASE_URL || "http://localhost:8000";

const mlClient = axios.create({
  baseURL: ML_BASE_URL,
  timeout: 30000, // 30 seconds limit for heavy calculations
});

/**
 * Wraps Axios requests with latency measurement and error normalization.
 * 
 * @param {Function} requestFn - A function returning an Axios promise.
 * @returns {Promise<Object>} Object containing response data and durationMs.
 */
const handleResponse = async (requestFn) => {
  const startTime = Date.now();
  try {
    const response = await requestFn();
    const duration = Date.now() - startTime;
    return {
      data: response.data,
      durationMs: duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    if (error.response) {
      // Server responded with non-2xx status code
      const err = new Error(
        error.response.data?.details ||
        error.response.data?.message ||
        "ML Service Error"
      );
      err.status = error.response.status;
      err.data = error.response.data;
      err.durationMs = duration;
      throw err;
    } else if (error.request) {
      // Request was made but no response was received (service down)
      const err = new Error("FastAPI ML service is unreachable.");
      err.status = 503;
      err.durationMs = duration;
      throw err;
    } else {
      // Error during request setup
      const err = new Error(error.message);
      err.status = 500;
      err.durationMs = duration;
      throw err;
    }
  }
};

export const forecast = async (payload) => {
  return handleResponse(() => mlClient.post("/api/v1/ml/forecast", payload));
};

export const recharge = async (payload) => {
  return handleResponse(() => mlClient.post("/api/v1/ml/recharge", payload));
};

export const classify = async (payload) => {
  return handleResponse(() => mlClient.post("/api/v1/ml/classify", payload));
};

export const anomalies = async (payload) => {
  return handleResponse(() => mlClient.post("/api/v1/ml/anomalies", payload));
};

export const gapFill = async (payload) => {
  return handleResponse(() => mlClient.post("/api/v1/ml/gap-fill", payload));
};

export const extraction = async (payload) => {
  return handleResponse(() => mlClient.post("/api/v1/ml/extraction", payload));
};
