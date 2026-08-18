import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
const [forecasts, recharge, alerts, readings, stations] = await Promise.all([
  p.forecast.count(),
  p.rechargeResult.count(),
  p.alert.count(),
  p.groundwaterReading.count(),
  p.station.count(),
]);
const ingestion = await p.ingestionLog.findFirst({ orderBy: { startedAt: "desc" } });
const forecastSample = await p.forecast.findFirst({ orderBy: { generatedAt: "desc" } });
const rechargeSample = await p.rechargeResult.findFirst({ orderBy: { createdAt: "desc" } });
const alertSample = await p.alert.findFirst({ orderBy: { createdAt: "desc" } });
console.log(JSON.stringify({ forecasts, recharge, alerts, readings, stations, ingestion, forecastSample, rechargeSample, alertSample }, null, 2));
await p.$disconnect();
