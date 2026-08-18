import prisma from "../config/database.js";
import AQUIFER_MAPPING from "../config/aquiferMapping.js";
import { resolveStationAssessmentUnit } from "./adminBoundaryResolver.service.js";

/**
 * In-memory set of station IDs that have already been attempted for GIS
 * resolution and failed (AU_NOT_FOUND). Prevents re-running the expensive
 * 307-polygon PIP scan on every reading for the same unresolvable station.
 * Cleared on server restart.
 */
const _gisResolutionFailed = new Set();

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
      // Silenced to prevent loop print flooding: console.log(`ℹ️ [Metadata Enrichment] Station "${station.stationName}" is already fully mapped. Skipping.`);
      return station;
    }

    let updatedFields = {};

    // --- 1. Resolve Assessment Unit if missing ---
    if (!hasUnit) {
      const taluka = getTalukaName(station);

      if (station.state && station.district && taluka) {
        // Tier 1: Direct tehsil/block DB match
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
        // Tier 2: No tehsil/block — use GIS coordinate resolver
        // Skip if we already tried and failed for this station this session
        if (_gisResolutionFailed.has(station.id)) {
          // Silently skip — already attempted, won't succeed until AssessmentUnit seed is expanded
        } else {
          try {
            const mappedStations = await prisma.station.findMany({
              where: { NOT: { assessmentUnitId: null } },
              include: { assessmentUnit: true }
            });
            const geoResult = await resolveStationAssessmentUnit(station, mappedStations);
            if (geoResult.resolved) {
              updatedFields.assessmentUnitId = geoResult.assessmentUnitId;
              console.log(`✨ [Metadata Enrichment] GIS resolved Station "${station.stationName}" → Taluka="${geoResult.detectedTaluka}" [${geoResult.method}]`);
            } else {
              // Mark as failed so we don't retry on every reading
              _gisResolutionFailed.add(station.id);
            }
            // If not resolved, silently continue — non-blocking
          } catch (geoErr) {
            _gisResolutionFailed.add(station.id);
            // GIS resolution is non-blocking
          }
        }
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
        // Silenced to prevent loop print flooding: console.log(`ℹ️ [Metadata Enrichment] District field is empty. Cannot resolve AquiferType for Station "${station.stationName}".`);
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
