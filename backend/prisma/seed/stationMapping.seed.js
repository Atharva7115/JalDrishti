import AQUIFER_MAPPING from "../../src/config/aquiferMapping.js";

/**
 * Station Mapping Seed Script
 * - Links Stations to their corresponding AssessmentUnit based on exact administrative matching.
 * - Links Stations to their corresponding AquiferType based on Maharashtra district mapping or remains null.
 */
export const mapStations = async (prisma) => {
  console.log("🌱 Mapping Stations to Assessment Units and Aquifer Types...");

  // Helper to extract taluka with block/tehsil fallback
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

  // 1. Fetch all AquiferTypes to build a lookup map of Name -> ID
  const aquiferTypes = await prisma.aquiferType.findMany();
  const aquiferMap = new Map(aquiferTypes.map((a) => [a.name.toLowerCase(), a.id]));

  // 2. Fetch all AssessmentUnits to build a lookup map of "state|district|taluka" -> ID
  const assessmentUnits = await prisma.assessmentUnit.findMany();
  const unitMap = new Map(
    assessmentUnits.map((u) => [
      `${u.state}|${u.district}|${u.taluka}`.toLowerCase(),
      u.id,
    ])
  );

  // 3. Fetch all Stations to process mappings
  const stations = await prisma.station.findMany();
  console.log(`📌 Processing mappings for ${stations.length} stations...`);

  let mappedUnitsCount = 0;
  let mappedAquifersCount = 0;

  for (const station of stations) {
    let updateData = {};

    // --- Part 3: Map to AssessmentUnit ---
    const taluka = getTaluka(station);
    if (station.state && station.district && taluka) {
      const key = `${station.state.trim()}|${station.district.trim()}|${taluka.trim()}`.toLowerCase();
      const unitId = unitMap.get(key);
      if (unitId) {
        updateData.assessmentUnitId = unitId;
        mappedUnitsCount++;
      }
    }

    // --- Part 5: Map to AquiferType ---
    if (station.state && station.state.trim().toLowerCase() === "maharashtra" && station.district) {
      const normalizedDistrict = station.district.trim().toLowerCase();
      
      // Determine mapped aquifer type name based on config, default to Basalt if in MH but not matched
      const mappedTypeName = AQUIFER_MAPPING[normalizedDistrict] || "Weathered/Vesicular Jointed Basalt";
      
      const aquiferId = aquiferMap.get(mappedTypeName.toLowerCase());
      if (aquiferId) {
        updateData.aquiferTypeId = aquiferId;
        mappedAquifersCount++;
      }
    }

    // Perform DB update if mapping is resolved
    if (Object.keys(updateData).length > 0) {
      await prisma.station.update({
        where: { id: station.id },
        data: updateData,
      });
    }
  }

  console.log(`✅ Successfully mapped ${mappedUnitsCount} stations to Assessment Units.`);
  console.log(`✅ Successfully mapped ${mappedAquifersCount} stations to Aquifer Types.`);
};
