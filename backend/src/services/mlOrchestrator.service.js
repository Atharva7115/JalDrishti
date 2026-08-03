import prisma from "../config/database.js";
import * as mlService from "./ml.service.js";
import { buildForecastPayload } from "../builders/forecastPayload.builder.js";
import { buildRechargePayload } from "../builders/rechargePayload.builder.js";
import { buildClassificationPayload } from "../builders/classificationPayload.builder.js";
import { buildAnomalyPayload } from "../builders/anomalyPayload.builder.js";
import { buildGapFillPayload } from "../builders/gapFillPayload.builder.js";

/**
 * Orchestrator service to handle backend data retrieval, payload building,
 * FastAPI microservice invocation, results persistence, and formatting.
 */

/**
 * Orchestrates water level forecasting for a specific station.
 * 
 * @param {string} stationId - UUID of the station.
 * @param {number} horizonDays - Forecast length in days.
 * @param {string} freq - Resampling offset frequency.
 * @returns {Promise<Object>} Object with metrics, forecast list, and performance durations.
 */
export const orchestrateForecast = async (stationId, horizonDays = 14, freq = "D") => {
  // 1. Verify station existence
  const station = await prisma.station.findUnique({
    where: { id: stationId },
  });

  if (!station) {
    const error = new Error("Station not found");
    error.status = 404;
    throw error;
  }

  // 2. Fetch readings sorted chronologically
  const readings = await prisma.groundwaterReading.findMany({
    where: { stationId },
    orderBy: { timestamp: "asc" },
  });

  if (!readings || readings.length === 0) {
    const error = new Error("No historical readings found for this station.");
    error.status = 400;
    throw error;
  }

  // 3. Build payload using builder
  const payload = buildForecastPayload(readings, horizonDays, freq);

  // 4. Call FastAPI ML service
  const mlResult = await mlService.forecast(payload);

  // 5. Persist Forecast records to database
  const forecastRecords = mlResult.data.forecast;
  const dbStart = Date.now();

  const savePromises = forecastRecords.map((point) => {
    const forecastTime = new Date(point.timestamp);
    // Simple confidence proxy: half the interval range (yhat_upper - yhat_lower) / 2
    const confidence = point.yhat_upper !== undefined && point.yhat_lower !== undefined
      ? (Number(point.yhat_upper) - Number(point.yhat_lower)) / 2
      : null;

    return prisma.forecast.upsert({
      where: {
        stationId_forecastTime_modelName: {
          stationId,
          forecastTime,
          modelName: "Prophet",
        },
      },
      update: {
        predictedLevel: Number(point.predicted_level),
        confidence,
      },
      create: {
        stationId,
        forecastTime,
        predictedLevel: Number(point.predicted_level),
        confidence,
        modelName: "Prophet",
      },
    });
  });

  await prisma.$transaction(savePromises);
  const dbDuration = Date.now() - dbStart;

  return {
    mae: mlResult.data.mae,
    rmse: mlResult.data.rmse,
    forecast: forecastRecords,
    mlDurationMs: mlResult.durationMs,
    dbSaveTimeMs: dbDuration,
  };
};

/**
 * Orchestrates groundwater recharge calculation for a specific station.
 * 
 * @param {string} stationId - UUID of the station.
 * @returns {Promise<Object>} Object with recharge details and durations.
 */
export const orchestrateRecharge = async (stationId) => {
  // 1. Fetch station with its AquiferType and AssessmentUnit (with assessments)
  const station = await prisma.station.findUnique({
    where: { id: stationId },
    include: {
      aquiferType: true,
      assessmentUnit: {
        include: {
          assessments: {
            orderBy: { year: "desc" },
          },
        },
      },
    },
  });

  if (!station) {
    const error = new Error("Station not found");
    error.status = 404;
    throw error;
  }

  // 2. Resolve Specific Yield from AquiferType (defaulting to 0.02 if missing)
  const specificYield = station.aquiferType?.specificYield !== undefined
    ? Number(station.aquiferType.specificYield)
    : 0.02;

  // 3. Resolve Area from latest AssessmentData (convert km2 to m2, pass null if missing)
  const latestAssessment = station.assessmentUnit?.assessments?.[0];
  let areaSqm = null;
  if (latestAssessment && latestAssessment.area !== null && latestAssessment.area !== undefined) {
    areaSqm = Number(latestAssessment.area) * 1000000;
  }

  // 4. Fetch readings sorted chronologically
  const readings = await prisma.groundwaterReading.findMany({
    where: { stationId },
    orderBy: { timestamp: "asc" },
  });

  if (!readings || readings.length === 0) {
    const error = new Error("No historical readings found for this station.");
    error.status = 400;
    throw error;
  }

  // 5. Build request payload
  const payload = buildRechargePayload(readings, specificYield, areaSqm);

  // 6. Call FastAPI ML service
  const mlResult = await mlService.recharge(payload);

  // 7. Persist Recharge records to database
  const rechargeRecords = mlResult.data.yearly;
  const dbStart = Date.now();

  const years = rechargeRecords.map((item) => Number(item.year));
  const periodStarts = years.map((y) => new Date(Date.UTC(y, 0, 1)));

  // Delete older records matching the same period to prevent duplicates
  await prisma.rechargeResult.deleteMany({
    where: {
      stationId,
      periodStart: {
        in: periodStarts,
      },
    },
  });

  const savePromises = rechargeRecords.map((item) => {
    const year = Number(item.year);
    const periodStart = new Date(Date.UTC(year, 0, 1));
    const periodEnd = new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));

    return prisma.rechargeResult.create({
      data: {
        stationId,
        periodStart,
        periodEnd,
        recharge: Number(item.recharge_m3),
        deltaWaterLevel: Number(item.water_table_rise_m),
        specificYield: Number(specificYield),
      },
    });
  });

  await Promise.all(savePromises);
  const dbDuration = Date.now() - dbStart;

  return {
    yearly: rechargeRecords,
    mlDurationMs: mlResult.durationMs,
    dbSaveTimeMs: dbDuration,
  };
};

/**
 * Orchestrates groundwater classification for a specific station.
 * 
 * @param {string} stationId - UUID of the station.
 * @returns {Promise<Object>} Classification result from FastAPI (returned directly to frontend).
 */
export const orchestrateClassification = async (stationId) => {
  // 1. Fetch station with its AssessmentUnit (to look up official extraction)
  const station = await prisma.station.findUnique({
    where: { id: stationId },
    include: {
      assessmentUnit: {
        include: {
          assessments: {
            orderBy: { year: "desc" },
          },
        },
      },
    },
  });

  if (!station) {
    const error = new Error("Station not found");
    error.status = 404;
    throw error;
  }

  // 2. Fetch the latest official GEC assessment data
  const latestAssessment = station.assessmentUnit?.assessments?.[0];
  if (!latestAssessment || latestAssessment.annualExtraction === null || latestAssessment.annualExtraction === undefined) {
    const error = new Error("GEC Classification failed: official annual extraction data is unavailable in the database.");
    error.status = 501;
    throw error;
  }

  // 3. Compute the recharge volume on the fly using the recharge orchestrator
  const rechargeResult = await orchestrateRecharge(stationId);
  const latestRecharge = rechargeResult.yearly?.[rechargeResult.yearly.length - 1];

  if (!latestRecharge || !latestRecharge.recharge_m3) {
    const error = new Error("GEC Classification failed: insufficient recharge data calculated.");
    error.status = 400;
    throw error;
  }

  // 4. Build classification payload using builder
  const payload = buildClassificationPayload(
    latestRecharge.recharge_m3,
    latestAssessment.annualExtraction
  );

  // 5. Call FastAPI ML service (do NOT persist the classification category)
  const mlResult = await mlService.classify(payload);

  return {
    stage_of_extraction_pct: mlResult.data.stage_of_extraction_pct,
    classification: mlResult.data.classification,
    recharge_m3: latestRecharge.recharge_m3,
    annual_extraction_m3: latestAssessment.annualExtraction,
    year: latestRecharge.year,
    mlDurationMs: mlResult.durationMs,
  };
};

/**
 * Orchestrates anomaly detection for a specific station.
 * 
 * @param {string} stationId - UUID of the station.
 * @param {string} freq - Time frequency for resampling.
 * @returns {Promise<Object>} Anomaly detection result from FastAPI.
 */
export const orchestrateAnomalies = async (stationId, freq = "D") => {
  // 1. Verify station existence
  const station = await prisma.station.findUnique({
    where: { id: stationId },
  });

  if (!station) {
    const error = new Error("Station not found");
    error.status = 404;
    throw error;
  }

  // 2. Fetch readings sorted chronologically
  const readings = await prisma.groundwaterReading.findMany({
    where: { stationId },
    orderBy: { timestamp: "asc" },
  });

  if (!readings || readings.length === 0) {
    const error = new Error("No historical readings found for this station.");
    error.status = 400;
    throw error;
  }

  // 3. Build anomalies payload
  const payload = buildAnomalyPayload(readings, freq);

  // 4. Call FastAPI ML service (returned directly; do NOT persist)
  const mlResult = await mlService.anomalies(payload);

  return {
    anomalies: mlResult.data.anomalies,
    mlDurationMs: mlResult.durationMs,
  };
};

/**
 * Orchestrates gap filling (data imputation) for a specific station.
 * 
 * @param {string} stationId - UUID of the station.
 * @param {string} freq - Time frequency for resampling.
 * @returns {Promise<Object>} Gap filling result from FastAPI.
 */
export const orchestrateGapFill = async (stationId, freq = "D") => {
  // 1. Verify station existence
  const station = await prisma.station.findUnique({
    where: { id: stationId },
  });

  if (!station) {
    const error = new Error("Station not found");
    error.status = 404;
    throw error;
  }

  // 2. Fetch readings sorted chronologically
  const readings = await prisma.groundwaterReading.findMany({
    where: { stationId },
    orderBy: { timestamp: "asc" },
  });

  if (!readings || readings.length === 0) {
    const error = new Error("No historical readings found for this station.");
    error.status = 400;
    throw error;
  }

  // 3. Build gap filling payload
  const payload = buildGapFillPayload(readings, freq);

  // 4. Call FastAPI ML service (returned directly; do NOT persist)
  const mlResult = await mlService.gapFill(payload);

  return {
    readings: mlResult.data.readings,
    mlDurationMs: mlResult.durationMs,
  };
};

