import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
import { startScheduler } from "./services/scheduler.service.js";

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log("======================================");
  console.log("     JalDrishti Backend Started");
  console.log("======================================");
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌐 API: http://localhost:${PORT}`);

  if (process.env.ENABLE_SCHEDULER === "true") {
    startScheduler();
    console.log("🕒 Scheduler Enabled");
  } else {
    console.log("🕒 Scheduler Disabled");
  }

  console.log("======================================");
});