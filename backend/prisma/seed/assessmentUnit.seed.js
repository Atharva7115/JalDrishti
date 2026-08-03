/**
 * Assessment Units Seed Script
 * Reads every Station, extracts unique (state, district, block/tehsil),
 * and creates corresponding AssessmentUnit records using upsert.
 */
export const seedAssessmentUnits = async (prisma) => {
  console.log("🌱 Harvesting unique Assessment Units from existing Stations...");

  const stations = await prisma.station.findMany({
    select: {
      state: true,
      district: true,
      block: true,
      tehsil: true,
    },
  });

  const getTaluka = (station) => {
    if (
      station.block &&
      station.block !== "null" &&
      station.block.trim() !== "" &&
      station.block.trim() !== "-"
    ) {
      return station.block.trim();
    }
    if (
      station.tehsil &&
      station.tehsil !== "null" &&
      station.tehsil.trim() !== "" &&
      station.tehsil.trim() !== "-"
    ) {
      return station.tehsil.trim();
    }
    return null;
  };

  const uniqueUnitsMap = new Map();

  for (const station of stations) {
    if (!station.state || !station.district) {
      continue;
    }

    const state = station.state.trim();
    const district = station.district.trim();
    const taluka = getTaluka(station);

    if (!taluka || state === "-" || district === "-") {
      continue;
    }

    // Compound key to guarantee uniqueness
    const key = `${state}|${district}|${taluka}`.toLowerCase();
    
    if (!uniqueUnitsMap.has(key)) {
      uniqueUnitsMap.set(key, {
        state,
        district,
        taluka,
      });
    }
  }

  const uniqueUnits = Array.from(uniqueUnitsMap.values());
  console.log(`📌 Found ${uniqueUnits.length} unique Assessment Units (State, District, Taluka combinations).`);

  let createdCount = 0;
  for (const unit of uniqueUnits) {
    await prisma.assessmentUnit.upsert({
      where: {
        state_district_taluka: {
          state: unit.state,
          district: unit.district,
          taluka: unit.taluka,
        },
      },
      update: {},
      create: unit,
    });
    createdCount++;
  }

  console.log(`✅ Successfully seeded/upserted ${createdCount} Assessment Units.`);
};
