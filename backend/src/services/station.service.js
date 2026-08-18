import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Service to manage station data operations.
 */

/**
 * Fetch all stations with search, pagination, and latest status.
 */

function generateRecommendations(category, level, aquiferType = null) {
  const list = [];
  const cat = category ? category.toUpperCase() : "SAFE";

  if (cat === "OVER_EXPLOITED") {
    list.push("Emergency conservation measures.");
    list.push("Artificial recharge recommendations.");
  } else if (cat === "CRITICAL") {
    list.push("Restrict unnecessary pumping.");
    list.push("Prioritize drinking water usage.");
    list.push("Increase recharge interventions.");
  } else if (cat === "SEMI_CRITICAL") {
    list.push("Reduce extraction during dry periods.");
    list.push("Promote recharge activities.");
  } else {
    list.push("Continue monitoring groundwater levels.");
    list.push("Maintain recharge structures.");
  }

  // Deep water table warning
  if (level !== null && level < -15.0) {
    list.push("Deep water table warning: Minimize borewell extraction.");
  }

  // Aquifer specific recommendation
  if (aquiferType) {
    list.push(`Soil Management: Local aquifer behaves as ${aquiferType}.`);
  }

  return list;
}

// Fetch stations with latest assessment
export const getStations = async ({ page = 1, limit = 10, search = "" }) => {
  const skip = (page - 1) * limit;

  // Build search filter on stationName, district, or taluka
  const searchFilter = search
    ? {
        OR: [
          { stationName: { contains: search, mode: "insensitive" } },
          { district: { contains: search, mode: "insensitive" } },
          {
            assessmentUnit: {
              taluka: { contains: search, mode: "insensitive" },
            },
          },
        ],
      }
    : {};

  // Fetch count
  const total = await prisma.station.count({
    where: searchFilter,
  });

  // Fetch latest readings for all stations in a single optimized raw query
  const latestReadings = await prisma.$queryRaw`
    SELECT "stationId", "cleanedWaterLevel", "rawWaterLevel", "timestamp"
    FROM (
      SELECT "stationId", "cleanedWaterLevel", "rawWaterLevel", "timestamp",
             ROW_NUMBER() OVER (PARTITION BY "stationId" ORDER BY "timestamp" DESC) as rn
      FROM "GroundwaterReading"
    ) t
    WHERE rn = 1
  `;

  // Map stationId -> reading data
  const readingMap = new Map();
  for (const r of latestReadings) {
    readingMap.set(r.stationId, {
      waterLevel: r.cleanedWaterLevel !== null ? r.cleanedWaterLevel : r.rawWaterLevel,
      timestamp: r.timestamp
    });
  }

  // Fetch stations with latest assessment
  const stations = await prisma.station.findMany({
    where: searchFilter,
    include: {
      assessmentUnit: {
        include: {
          assessments: {
            orderBy: { year: "desc" },
            take: 1,
          },
        },
      },
      aquiferType: true
    },
    skip,
    take: limit,
    orderBy: { stationName: "asc" },
  });

  // Map to target response schema
  const mapped = stations.map((s) => {
    const latestReading = readingMap.get(s.id);
    const latestAssessment = s.assessmentUnit?.assessments?.[0];
    const category = latestAssessment ? latestAssessment.category : null;
    const level = latestReading ? latestReading.waterLevel : null;

    return {
      id: s.id,
      stationName: s.stationName,
      district: s.district,
      taluka: s.assessmentUnit?.taluka || s.tehsil || s.block || null,
      latitude: s.latitude,
      longitude: s.longitude,
      latestWaterLevel: level,
      latestReadingTime: latestReading ? latestReading.timestamp : null,
      assessmentCategory: category,
      recommendations: generateRecommendations(category, level, s.aquiferType?.name)
    };
  });

  return {
    stations: mapped,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  };
};

/**
 * Fetch a single station's complete metadata and latest assessments/readings.
 */
export const getStationById = async (stationId) => {
  const station = await prisma.station.findUnique({
    where: { id: stationId },
    include: {
      aquiferType: true,
      assessmentUnit: {
        include: {
          assessments: {
            orderBy: { year: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  if (!station) {
    return null;
  }

  // Get reading count, latest AND second-to-last reading, and first reading
  const readingsCount = await prisma.groundwaterReading.count({
    where: { stationId },
  });

  const latestTwoReadings = await prisma.groundwaterReading.findMany({
    where: { stationId },
    orderBy: { timestamp: "desc" },
    take: 2,
  });

  const firstReading = await prisma.groundwaterReading.findFirst({
    where: { stationId },
    orderBy: { timestamp: "asc" },
  });

  const latestReading = latestTwoReadings[0] || null;
  const prevReading = latestTwoReadings[1] || null;

  // Compute quality score: actual readings vs expected (using 30-day window @ 1/day)
  const expectedReadings = 365; // 1 reading per day for 1 year
  const qualityScore = readingsCount > 0
    ? Math.min(100, Math.round((Math.min(readingsCount, expectedReadings) / expectedReadings) * 100))
    : 0;

  // Compute trend from level delta between last two readings
  const latestLevel = latestReading
    ? (latestReading.cleanedWaterLevel ?? latestReading.rawWaterLevel)
    : null;
  const prevLevel = prevReading
    ? (prevReading.cleanedWaterLevel ?? prevReading.rawWaterLevel)
    : null;
  let trend = 'stable';
  if (latestLevel !== null && prevLevel !== null) {
    const delta = latestLevel - prevLevel;
    if (delta < -0.3) trend = 'declining';
    else if (delta > 0.3) trend = 'rising';
  }

  return {
    id: station.id,
    stationName: station.stationName,
    agency: station.agency,
    state: station.state,
    stateLGDCode: station.stateLGDCode,
    district: station.district,
    districtLGDCode: station.districtLGDCode,
    tehsil: station.tehsil,
    block: station.block,
    village: station.village,
    latitude: station.latitude,
    longitude: station.longitude,
    rlMsl: station.rlMsl,
    isActive: station.isActive,
    createdAt: station.createdAt,
    updatedAt: station.updatedAt,
    aquiferType: station.aquiferType,
    riverBasin: station.assessmentUnit?.riverBasin || station.assessmentUnit?.basin || null,
    assessmentUnit: station.assessmentUnit
      ? {
          id: station.assessmentUnit.id,
          state: station.assessmentUnit.state,
          district: station.assessmentUnit.district,
          taluka: station.assessmentUnit.taluka,
        }
      : null,
    latestAssessment: station.assessmentUnit?.assessments?.[0] || null,
    readingSummary: {
      count: readingsCount,
      latestReadingTime: latestReading ? latestReading.timestamp : null,
      firstReadingTime: firstReading ? firstReading.timestamp : null,
      latestWaterLevel: latestLevel,
      previousWaterLevel: prevLevel,
      qualityScore,
    },
    trend,
    recommendations: generateRecommendations(
      station.assessmentUnit?.assessments?.[0]?.category,
      latestLevel,
      station.aquiferType?.name
    )
  };
};

/**
 * Fetch chronological readings for a specific station with optional time-range and limit bounds.
 */
export const getStationReadings = async (stationId, { from, to, limit }) => {
  const where = { stationId };

  if (from || to) {
    where.timestamp = {};
    if (from) {
      where.timestamp.gte = new Date(from);
    }
    if (to) {
      where.timestamp.lte = new Date(to);
    }
  }

  const readings = await prisma.groundwaterReading.findMany({
    where,
    orderBy: { timestamp: "asc" },
    take: limit ? Number(limit) : undefined,
  });

  return readings;
};
