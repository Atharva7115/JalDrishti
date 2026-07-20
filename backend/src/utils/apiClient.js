import axios from "axios";
import API_CONFIG from "../config/api.config.js";

const apiClient = axios.create({
  baseURL: API_CONFIG.nwdp.baseURL,
  timeout: API_CONFIG.nwdp.timeout,
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});

export default apiClient;