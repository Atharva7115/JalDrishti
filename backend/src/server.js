import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
import { ingestGroundwaterData } from "./services/ingestion.service.js";

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);

  try {
    await ingestGroundwaterData();
  } catch (error) {
    console.error("Error during ingestion:", error.message);
  }
});