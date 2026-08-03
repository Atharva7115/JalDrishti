import prisma from "../config/database.js";
import AQUIFER_MAPPING from "../config/aquiferMapping.js";

/**
 * Enriches a station with its corresponding AssessmentUnit and AquiferType.
 * 
 * Heuristics:
 * 1. Skip resolving if metadata is already present.
 * 2. AssessmentUnit: Prefer block, fall back to tehsil. Exact match against database.
 * 3. AquiferType: Strict lookup via aquiferMapping.js based on district name.
 * 4. Error Handling: Non-blocking. Log warnings/errors but do not throw or halt ingestion.
 * 
 * @param {Object} station - The station record from database.
 * @returns {Promise<Object>} - The enriched (or unchanged) station record.
 */
export const enrichStationMetadata = async (station) => {
  try {
    const hasUnit = !!station.assessmentUnitId;
    const hasAquifer = !!station.aquiferTypeId;

    // Performance Optimization: Skip database lookups if both are already mapped
    if (hasUnit && hasAquifer) {
      console.log(`ℹ️ [Metadata Enrichment] Station "${station.stationName}" is already fully mapped. Skipping.`);
      return station;
    }

    let updatedFields = {};

    // --- 1. Resolve Assessment Unit if missing ---
    if (!hasUnit) {
      const taluka = getTalukaName(station);

      if (station.state && station.district && taluka) {
        const state = station.state.trim();
        const district = station.district.trim();

        try {
          const unit = await prisma.assessmentUnit.findUnique({
            where: {
              state_district_taluka: {
                state,
                district,
                taluka,
              },
            },
          });

          if (unit) {
            updatedFields.assessmentUnitId = unit.id;
            console.log(`✨ [Metadata Enrichment] Mapped Station "${station.stationName}" to AssessmentUnit: ${state}/${district}/${taluka}`);
          } else {
            console.log(`⚠️ [Metadata Enrichment] AssessmentUnit not found in DB for: ${state}/${district}/${taluka}`);
          }
        } catch (dbErr) {
          console.error(`❌ [Metadata Enrichment] Error querying AssessmentUnit:`, dbErr.message);
        }
      } else {
        console.log(`ℹ️ [Metadata Enrichment] Insufficient admin details to resolve AssessmentUnit for Station "${station.stationName}".`);
      }
    }

    // --- 2. Resolve Aquifer Type if missing ---
    if (!hasAquifer) {
      if (station.district) {
        const normalizedDistrict = station.district.trim().toLowerCase();
        const mappedTypeName = AQUIFER_MAPPING[normalizedDistrict];

        if (mappedTypeName) {
          try {
            const aquifer = await prisma.aquiferType.findUnique({
              where: { name: mappedTypeName },
            });

            if (aquifer) {
              updatedFields.aquiferTypeId = aquifer.id;
              console.log(`✨ [Metadata Enrichment] Mapped Station "${station.stationName}" to AquiferType: ${mappedTypeName}`);
            } else {
              console.log(`⚠️ [Metadata Enrichment] AquiferType "${mappedTypeName}" found in mapping config but not found in DB.`);
            }
          } catch (dbErr) {
            console.error(`❌ [Metadata Enrichment] Error querying AquiferType:`, dbErr.message);
          }
        } else {
          console.log(`⚠️ [Metadata Enrichment] AquiferType not found in mapping config for district: "${station.district}"`);
        }
      } else {
        console.log(`ℹ️ [Metadata Enrichment] District field is empty. Cannot resolve AquiferType for Station "${station.stationName}".`);
      }
    }

    // --- 3. Save updates if any metadata was resolved ---
    if (Object.keys(updatedFields).length > 0) {
      const updatedStation = await prisma.station.update({
        where: { id: station.id },
        data: updatedFields,
      });
      // Mutate the passed object reference so in-memory cache stays in sync
      station.assessmentUnitId = updatedStation.assessmentUnitId;
      station.aquiferTypeId = updatedStation.aquiferTypeId;
      
      console.log(`✅ [Metadata Enrichment] Successfully saved metadata updates for Station "${station.stationName}".`);
      return updatedStation;
    }

    return station;
  } catch (error) {
    // Critical Requirement: Metadata enrichment should NEVER stop or crash ingestion.
    console.error(`❌ [Metadata Enrichment Error] Failed to enrich Station "${station?.stationName || 'Unknown'}":`, error.message);
    return station;
  }
};

/**
 * Helper to extract Taluka with block/tehsil fallback logic.
 */
const getTalukaName = (station) => {
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
