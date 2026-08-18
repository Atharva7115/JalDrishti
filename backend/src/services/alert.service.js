import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Generate alerts for a specific station (optimized, database-driven)
 * @param {string} stationId 
 */
export async function generateStationAlerts(stationId) {
  const station = await prisma.station.findUnique({
    where: { id: stationId },
    include: { 
      readings: { orderBy: { timestamp: "desc" }, take: 10 },
      forecasts: { orderBy: { timestamp: "desc" }, take: 30 }
    }
  });

  if (!station) {
    throw new Error(`Station with ID ${stationId} not found`);
  }

  const generatedAlerts = [];

  // Helper to safely create an alert if an unresolved one does not already exist
  const triggerAlert = async (title, message, severity) => {
    const existing = await prisma.alert.findFirst({
      where: {
        stationId,
        title,
        isResolved: false
      }
    });

    if (!existing) {
      const alert = await prisma.alert.create({
        data: {
          stationId,
          title,
          message,
          severity
        }
      });
      generatedAlerts.push(alert);
    }
  };

  // 1. Classification Alerts (Over-Exploited / Critical)
  if (station.assessmentCategory === "OVER_EXPLOITED") {
    await triggerAlert(
      "GEC Over-Exploited Status",
      `Station GEC classification is OVER_EXPLOITED. Groundwater extraction exceeds sustainable limits.`,
      "CRITICAL"
    );
  } else if (station.assessmentCategory === "CRITICAL") {
    await triggerAlert(
      "GEC Critical Status",
      `Station GEC classification is CRITICAL. Severe extraction pressure detected.`,
      "HIGH"
    );
  }

  // 2. Data/Telemetry Gap Alert
  if (station.readings.length > 0) {
    const latestReading = station.readings[0];
    const daysSinceLastUpdate = (new Date() - new Date(latestReading.timestamp)) / (1000 * 60 * 60 * 24);
    if (daysSinceLastUpdate > 30) {
      await triggerAlert(
        "Missing Telemetry Data",
        `No telemetry updates received for over 30 days. Last received reading: ${latestReading.timestamp.toLocaleDateString()}.`,
        "HIGH"
      );
    }
  } else {
    await triggerAlert(
      "Missing Telemetry Data",
      "No historical readings exist for this monitoring station.",
      "CRITICAL"
    );
  }

  // 3. Rapid Water Level Drop (within last 5 readings)
  if (station.readings.length >= 5) {
    const latestLevel = station.readings[0].cleanedWaterLevel || station.readings[0].rawWaterLevel;
    const pastLevel = station.readings[4].cleanedWaterLevel || station.readings[4].rawWaterLevel;
    const drop = latestLevel - pastLevel; // deeper bgl level = larger positive value
    if (drop > 2.0) {
      await triggerAlert(
        "Rapid Water Level Drop",
        `Water table depth has declined rapidly by ${drop.toFixed(2)}m in the last 5 readings.`,
        "HIGH"
      );
    }
  }

  // 4. Anomaly Detection Alert (database check)
  const recentAnomalies = station.readings.filter(r => r.isAnomaly);
  if (recentAnomalies.length > 0) {
    await triggerAlert(
      "Sensor Anomalies Detected",
      `ML cleaning algorithm flagged ${recentAnomalies.length} anomaly reading points in recent timeseries transmissions.`,
      "MEDIUM"
    );
  }

  // 5. Forecast Decline Alert (database check)
  if (station.forecasts.length > 0 && station.readings.length > 0) {
    const latestActual = station.readings[0].cleanedWaterLevel || station.readings[0].rawWaterLevel;
    const finalPredicted = station.forecasts[0].predictedLevel; // latest predicted record
    const predictedDecline = finalPredicted - latestActual;
    if (predictedDecline > 1.5) {
      await triggerAlert(
        "Forecasted Water Level Decline",
        `Model predicts a water level decline of ${predictedDecline.toFixed(2)}m over the next forecast horizon.`,
        "MEDIUM"
      );
    }
  }

  return generatedAlerts;
}

/**
 * Generate alerts for all stations in the database
 */
export async function generateAllAlerts() {
  const stations = await prisma.station.findMany({ select: { id: true } });
  let totalGenerated = 0;

  // Run in chunks to prevent database lockups
  const chunkSize = 100;
  for (let i = 0; i < stations.length; i += chunkSize) {
    const chunk = stations.slice(i, i + chunkSize);
    await Promise.all(chunk.map(async (s) => {
      try {
        const alerts = await generateStationAlerts(s.id);
        totalGenerated += alerts.length;
      } catch (err) {
        // Silently log and ignore single failures
      }
    }));
  }

  return { success: true, count: totalGenerated };
}

/**
 * Acknowledge an alert
 * @param {string} alertId 
 */
export async function acknowledgeAlert(alertId) {
  return prisma.alert.update({
    where: { id: alertId },
    data: {
      isResolved: true,
      resolvedAt: new Date()
    }
  });
}

/**
 * Resolve an alert (alias/alternative method)
 * @param {string} alertId 
 */
export async function resolveAlert(alertId) {
  return prisma.alert.update({
    where: { id: alertId },
    data: {
      isResolved: true,
      resolvedAt: new Date()
    }
  });
}
