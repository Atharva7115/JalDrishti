import cron from "node-cron";
import { ingestGroundwaterData } from "./ingestion.service.js";

let isRunning = false;

export const startScheduler = () => {
  console.log("======================================");
  console.log("      Ingestion Scheduler Started");
  console.log("======================================");
  console.log("Schedule : Every 6 Hours");
  console.log("======================================");

  // Runs at 00:00, 06:00, 12:00 and 18:00
  cron.schedule("0 */6 * * *", async () => {
    if (isRunning) {
      console.log("⚠️ Previous ingestion still running. Skipping...");
      return;
    }

    isRunning = true;

    console.log("\n======================================");
    console.log(" Scheduled Ingestion Triggered");
    console.log("======================================");

    try {
      await ingestGroundwaterData();

      console.log("✅ Scheduled ingestion completed.");
    } catch (error) {
      console.error("❌ Scheduled ingestion failed.");
      console.error(error.message);
    } finally {
      isRunning = false;
    }
  });
};