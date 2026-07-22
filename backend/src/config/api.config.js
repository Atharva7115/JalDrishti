const API_CONFIG = {
  nwdp: {
    baseURL: process.env.NWDP_BASE_URL,
    apiPath: process.env.NWDP_API_PATH,

    resourceId: process.env.NWDP_RESOURCE_ID,

    defaultState: process.env.DEFAULT_STATE,

    batchSize: Number(process.env.NWDP_BATCH_SIZE) || 1000,

    timeout: 30000,
  },
};

export default API_CONFIG;