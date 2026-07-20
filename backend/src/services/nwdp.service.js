import apiClient from "../utils/apiClient.js";
import API_CONFIG from "../config/api.config.js";

export const fetchGroundwaterData = async (
  limit = API_CONFIG.nwdp.defaultBatchSize,
  offset = 0
) => {
  try {
    const response = await apiClient.get(API_CONFIG.nwdp.apiPath, {
      params: {
        resource_id: API_CONFIG.nwdp.resourceId,

        filters: JSON.stringify({
          State: API_CONFIG.nwdp.defaultState,
        }),

        limit,
        offset,
      },
    });

    return response.data.result;
  } catch (error) {
    console.error("Failed to fetch groundwater data:", error.message);
    throw error;
  }
};