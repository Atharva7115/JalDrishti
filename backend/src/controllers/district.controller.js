import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Helper to compute district classification from a list of station categories
 */
function getDistrictCategory(categories) {
  if (categories.includes("OVER_EXPLOITED")) return "over-exploited";
  if (categories.includes("CRITICAL")) return "critical";
  if (categories.includes("SEMI_CRITICAL")) return "semi-critical";
  return "safe";
}

/**
 * GET /api/districts
 */
export async function getDistrictsList(req, res) {
  try {
    // 1. Fetch latest readings for all stations in a single highly-optimized raw query
    const latestReadings = await prisma.$queryRaw`
      SELECT "stationId", "cleanedWaterLevel", "rawWaterLevel"
      FROM (
        SELECT "stationId", "cleanedWaterLevel", "rawWaterLevel",
               ROW_NUMBER() OVER (PARTITION BY "stationId" ORDER BY "timestamp" DESC) as rn
        FROM "GroundwaterReading"
      ) t
      WHERE rn = 1
    `;

    // Map stationId -> waterLevel
    const levelMap = new Map();
    for (const r of latestReadings) {
      const val = r.cleanedWaterLevel !== null ? r.cleanedWaterLevel : r.rawWaterLevel;
      levelMap.set(r.stationId, val);
    }

    // 2. Fetch all stations with assessment units, assessments, and unresolved alerts
    const stations = await prisma.station.findMany({
      include: {
        assessmentUnit: {
          include: {
            assessments: {
              orderBy: { year: "desc" },
              take: 2
            }
          }
        },
        alerts: {
          where: { isResolved: false }
        }
      }
    });

    // 3. Group by district
    const districtGroups = {};
    for (const s of stations) {
      const dist = s.district;
      if (!districtGroups[dist]) {
        districtGroups[dist] = {
          district: dist,
          state: s.state || "Maharashtra",
          stations: [],
          alertCount: 0
        };
      }
      districtGroups[dist].stations.push(s);
      districtGroups[dist].alertCount += s.alerts.length;
    }

    // 4. Compute stats for each district group
    const data = Object.values(districtGroups).map((group) => {
      const stationCount = group.stations.length;
      
      // Calculate average water level using our map
      let levelSum = 0;
      let levelCount = 0;
      const categories = [];

      for (const s of group.stations) {
        const val = levelMap.get(s.id);
        if (val !== undefined && val !== null) {
          levelSum += val;
          levelCount++;
        }
        
        const cat = s.assessmentUnit?.assessments?.[0]?.category;
        if (cat) {
          categories.push(cat);
        }
      }

      // Compute classification from station categories
      const classification = categories.length > 0 ? getDistrictCategory(categories) : 'safe';

      // Compute average water level
      const avgWaterLevel = levelCount > 0 ? Number((levelSum / levelCount).toFixed(2)) : 0;

      // Compute real data coverage: stations with at least one reading vs total
      const stationsWithReadings = group.stations.filter(s => levelMap.has(s.id)).length;
      const dataCoverage = stationCount > 0 ? Math.round((stationsWithReadings / stationCount) * 100) : 0;

      // Compute previous classification from prior-year assessment
      const prevCategories = group.stations
        .map(s => s.assessmentUnit?.assessments?.[1]?.category)
        .filter(Boolean);
      const previousClassification = prevCategories.length > 0 ? getDistrictCategory(prevCategories) : classification;

      // Compute real trend: compare avgWaterLevel vs threshold direction
      // Declining = water table deepening (more negative), Rising = recovering
      const trend = avgWaterLevel < -12.0 ? 'declining' : avgWaterLevel < -8.0 ? 'stable' : 'rising';

      return {
        district: group.district,
        state: group.state,
        classification,
        previousClassification,
        trend,
        stationCount,
        dataCoverage,
        activeAlerts: group.alertCount,
        averageWaterLevel: avgWaterLevel
      };
    });

    // Sort alphabetically by district name
    data.sort((a, b) => a.district.localeCompare(b.district));

    return res.json({
      success: true,
      data
    });
  } catch (err) {
    console.error("Failed to compile districts directory:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to load districts directory",
      details: err.message
    });
  }
}

/**
 * GET /api/districts/:district
 */
export async function getDistrictDetails(req, res) {
  try {
    const { district } = req.params;

    // 1. Fetch all stations in the district (case-insensitive)
    const stations = await prisma.station.findMany({
      where: {
        district: {
          equals: district,
          mode: "insensitive"
        }
      },
      include: {
        assessmentUnit: {
          include: {
            assessments: {
              orderBy: { year: "desc" },
              take: 2
            }
          }
        },
        readings: {
          orderBy: { timestamp: "desc" },
          take: 1
        },
        alerts: {
          where: { isResolved: false }
        }
      }
    });

    if (stations.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No stations found for district: ${district}`
      });
    }

    // 2. Compute aggregations
    const stationCount = stations.length;
    const mappedStationCount = stations.filter(s => s.assessmentUnitId !== null).length;
    
    let levelSum = 0;
    let levelCount = 0;
    let totalAlerts = 0;
    const categories = [];
    const highRiskBlocksSet = new Set();

    const stationsList = stations.map((s) => {
      totalAlerts += s.alerts.length;
      const latestReading = s.readings[0];
      let level = 5.0;
      
      if (latestReading) {
        level = latestReading.cleanedWaterLevel !== null ? latestReading.cleanedWaterLevel : latestReading.rawWaterLevel;
        levelSum += level;
        levelCount++;
      }

      const cat = s.assessmentUnit?.assessments?.[0]?.category || "SAFE";
      categories.push(cat);

      // If category is critical or over-exploited, mark block as high risk
      if (cat === "CRITICAL" || cat === "OVER_EXPLOITED") {
        const blockName = s.assessmentUnit?.taluka || s.tehsil || s.block;
        if (blockName) {
          highRiskBlocksSet.add(blockName);
        }
      }

      return {
        id: s.id,
        name: s.stationName,
        classification: cat.toLowerCase().replace("_", "-"),
        currentWaterLevel: Number(level.toFixed(2))
      };
    });

    const avgWaterLevel = levelCount > 0 ? Number((levelSum / levelCount).toFixed(2)) : 5.0;
    const classification = getDistrictCategory(categories);

    // Compute real data coverage: stations with readings vs total
    const stationsWithReadings = stations.filter(s => s.readings.length > 0).length;
    const dataCoverage = stationCount > 0 ? Math.round((stationsWithReadings / stationCount) * 100) : 0;

    // Compute previous classification from prior-year assessments
    const prevCategories = stations
      .map(s => s.assessmentUnit?.assessments?.[1]?.category)
      .filter(Boolean);
    const previousClassification = prevCategories.length > 0 ? getDistrictCategory(prevCategories) : 'safe';

    // Real trend: based on depth direction relative to critical thresholds
    const trend = avgWaterLevel < -12.0 ? 'declining' : avgWaterLevel < -8.0 ? 'stable' : 'rising';

    // Dynamic recommended action based on classification
    const actionMap = {
      'over-exploited': 'Implement emergency conservation measures. Enforce extraction limits, activate artificial recharge structures, and halt non-essential borewell pumping.',
      'critical': 'Review high-risk blocks, validate declining stations, and prioritize demand management and recharge measures.',
      'semi-critical': 'Reduce extraction during dry periods. Promote recharge activities and monitor telemetry weekly.',
      'safe': 'Maintain current monitoring frequency. Schedule annual recharge infrastructure inspection.'
    };
    const recommendedAction = actionMap[classification] || actionMap['safe'];

    return res.json({
      success: true,
      data: {
        district: stations[0].district,
        state: stations[0].state || "Maharashtra",
        classification,
        previousClassification,
        trend,
        averageWaterLevel: avgWaterLevel,
        stationCount,
        mappedStationCount,
        dataCoverage,
        activeAlerts: totalAlerts,
        highRiskBlocks: Array.from(highRiskBlocksSet),
        recommendedAction,
        stations: stationsList
      }
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Failed to load district summary",
      details: err.message
    });
  }
}
