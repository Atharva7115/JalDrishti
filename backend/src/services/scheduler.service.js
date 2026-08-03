import cron from "node-cron";
import { ingestGroundwaterData } from "./ingestion.service.js";
import {
  startIngestionLock,
  releaseIngestionLock,
} from "../utils/ingestionLock.js";
// const CRON_EXPRESSION = "*/1 * * * *";//for testing
const CRON_EXPRESSION = "0 */6 * * *"; // Every 6 hours

export const startScheduler = () => {
  console.log("======================================");
  console.log("     Ingestion Scheduler Started");
  console.log("======================================");
  console.log(`📅 Schedule : ${CRON_EXPRESSION}`);
  console.log("======================================");

  cron.schedule(CRON_EXPRESSION, async () => {
    console.log("\n======================================");
    console.log("     Scheduled Ingestion Triggered");
    console.log("======================================");

    // Prevent overlapping ingestion jobs
    if (!startIngestionLock()) {
      console.log("⚠️ Ingestion already running. Skipping scheduled run.");
      return;
    }

    try {
      await ingestGroundwaterData();
      console.log("✅ Scheduled ingestion completed successfully.");
    } catch (error) {
      console.error("❌ Scheduled ingestion failed.");
      console.error(error);
    } finally {
      releaseIngestionLock();
    }
  });

  console.log("🕒 Scheduler is active and waiting for the next trigger...");
};