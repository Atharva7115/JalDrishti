/**
 * DEEP FUNCTIONAL AUDIT SCRIPT
 * Executes live ML calculations on random stations to collect exact counts and validation proofs.
 */
import { PrismaClient } from "@prisma/client";
import { orchestrateForecast, orchestrateAnomalies, orchestrateGapFill, orchestrateRecharge, orchestrateClassification } from "../services/mlOrchestrator.service.js";

const p = new PrismaClient();

async function main() {
  console.log("\n============================================================");
  console.log("  JALDRISHTI DEEP PIPELINE FUNCTIONAL AUDIT");
  console.log("============================================================\n");

  // 1. Database Table Counts
  console.log("--- TABLE STATS ---");
  const [forecastCount, rechargeCount, auCount, adCount, alertCount, readingCount] = await Promise.all([
    p.forecast.count(),
    p.rechargeResult.count(),
    p.assessmentUnit.count(),
    p.assessmentData.count(),
    p.alert.count(),
    p.groundwaterReading.count()
  ]);
  console.log(`Forecast rows         : ${forecastCount}`);
  console.log(`RechargeResult rows   : ${rechargeCount}`);
  console.log(`AssessmentUnit rows   : ${auCount}`);
  console.log(`AssessmentData rows   : ${adCount}`);
  console.log(`Alert rows            : ${alertCount}`);
  console.log(`GroundwaterReading rows: ${readingCount}`);

  // 2. Select 20 random stations with at least 50 readings (so Prophet/STL has enough data to train)
  console.log("\n--- SELECTING AUDIT STATIONS ---");
  const candidates = await p.station.findMany({
    where: {
      readings: {
        some: {}
      }
    },
    include: {
      _count: {
        select: { readings: true }
      }
    }
  });

  const validStations = candidates.filter(s => s._count.readings >= 50);
  console.log(`Total stations with >=50 readings: ${validStations.length}`);

  // Shuffle and pick 20
  const shuffled = validStations.sort(() => 0.5 - Math.random());
  const auditStations = shuffled.slice(0, 20);
  console.log(`Selected 20 random stations for deep ML pipeline validation:\n`);
  auditStations.forEach((s, i) => console.log(`  ${i+1}. ${s.stationName.padEnd(25)} | Coords: (${s.latitude.toFixed(4)}, ${s.longitude.toFixed(4)}) | Readings: ${s._count.readings}`));

  // 3. Test Pipelines on these 20 Stations
  console.log("\n--- RUNNING PIPELINE TESTS ---");
  
  const forecastResults = [];
  const anomalyResults = [];
  const gapFillResults = [];
  const rechargeResults = [];
  const classificationResults = [];

  for (const s of auditStations) {
    console.log(`\nProcessing station: ${s.stationName} (${s.id})`);

    // A. Forecast
    try {
      const res = await orchestrateForecast(s.id, 14, "D");
      forecastResults.push({
        station: s.stationName,
        success: true,
        mae: res.mae,
        rmse: res.rmse,
        points: res.forecast.length,
        hasBounds: res.forecast.every(f => f.yhat_lower !== undefined && f.yhat_upper !== undefined)
      });
      console.log(`  ✅ Forecast : MAE=${res.mae.toFixed(4)}, RMSE=${res.rmse.toFixed(4)}, Points=${res.forecast.length}, HasBounds=${res.forecast.every(f => f.yhat_lower !== undefined && f.yhat_upper !== undefined)}`);
    } catch (e) {
      forecastResults.push({ station: s.stationName, success: false, error: e.message });
      console.error(`  ❌ Forecast failed: ${e.message}`);
    }

    // B. Anomalies
    try {
      const res = await orchestrateAnomalies(s.id, "D");
      const detected = res.anomalies.filter(a => a.is_anomaly).length;
      anomalyResults.push({
        station: s.stationName,
        success: true,
        totalPoints: res.anomalies.length,
        anomaliesDetected: detected
      });
      console.log(`  ✅ Anomalies: Points=${res.anomalies.length}, Detected=${detected}`);
    } catch (e) {
      anomalyResults.push({ station: s.stationName, success: false, error: e.message });
      console.error(`  ❌ Anomalies failed: ${e.message}`);
    }

    // C. Gap Fill
    try {
      // Find missing days by checking timestamps
      const sReadings = await p.groundwaterReading.findMany({
        where: { stationId: s.id },
        orderBy: { timestamp: "asc" }
      });
      const start = new Date(sReadings[0].timestamp);
      const end = new Date(sReadings[sReadings.length - 1].timestamp);
      const expectedDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
      const missingCount = expectedDays - sReadings.length;

      const res = await orchestrateGapFill(s.id, "D");
      const imputed = res.readings.filter(r => r.was_filled).length;
      gapFillResults.push({
        station: s.stationName,
        success: true,
        expectedDays,
        actualReadings: sReadings.length,
        missingDays: missingCount,
        imputedPoints: imputed
      });
      console.log(`  ✅ Gap-Fill : ExpectedDays=${expectedDays}, MissingDays=${missingCount}, Imputed=${imputed}`);
    } catch (e) {
      gapFillResults.push({ station: s.stationName, success: false, error: e.message });
      console.error(`  ❌ Gap-fill failed: ${e.message}`);
    }

    // D. Recharge
    try {
      const res = await orchestrateRecharge(s.id);
      rechargeResults.push({
        station: s.stationName,
        success: true,
        source: res.source,
        years: res.yearly.length,
        values: res.yearly.map(y => `${y.year}:${y.recharge_m3 || y.estimated_recharge_m3}`)
      });
      console.log(`  ✅ Recharge : Source=${res.source}, Years=${res.yearly.length}`);
    } catch (e) {
      rechargeResults.push({ station: s.stationName, success: false, error: e.message });
      console.error(`  ❌ Recharge failed: ${e.message}`);
    }

    // E. Classification
    try {
      const res = await orchestrateClassification(s.id);
      classificationResults.push({
        station: s.stationName,
        success: true,
        pct: res.stage_of_extraction_pct,
        category: res.classification,
        year: res.year
      });
      console.log(`  ✅ Classify : ExtraPct=${res.stage_of_extraction_pct.toFixed(2)}%, Category=${res.classification}`);
    } catch (e) {
      classificationResults.push({ station: s.stationName, success: false, error: e.message });
      console.error(`  ❌ Classification failed: ${e.message}`);
    }
  }

  // 4. Test Classifications for 50 stations to verify distribution
  console.log("\n--- RUNNING 50 STATION CLASSIFICATION DISTRIBUTION ---");
  const test50 = shuffled.slice(0, 50);
  const categoriesCount = { SAFE: 0, SEMI_CRITICAL: 0, CRITICAL: 0, OVER_EXPLOITED: 0, FAILED: 0 };
  
  for (const s of test50) {
    try {
      const res = await orchestrateClassification(s.id);
      const cat = res.classification.toUpperCase().replace("-", "_");
      categoriesCount[cat] = (categoriesCount[cat] || 0) + 1;
    } catch (e) {
      categoriesCount.FAILED++;
    }
  }
  console.log("Classification Distribution across 50 random stations:");
  console.log(JSON.stringify(categoriesCount, null, 2));

  console.log("\n============================================================");
  console.log("  DEEP AUDIT COMPLETE");
  console.log("============================================================\n");
  
  await p.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await p.$disconnect();
});
