/**
 * DATA INTEGRITY AUDIT
 * Runs all 6 audit sections against the live database.
 */
import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

const q = (sql, params = []) => p.$queryRawUnsafe(sql, ...params);

async function main() {
  console.log("\n============================================================");
  console.log("  JALDRISHTI DATA INTEGRITY AUDIT");
  console.log("============================================================\n");

  // ─── SECTION 1: STATION COUNT VALIDATION ─────────────────────────────────
  console.log("=== SECTION 1: STATION COUNT VALIDATION ===\n");

  const [{ total_stations }] = await q(`SELECT COUNT(*)::int AS total_stations FROM "Station"`);
  console.log(`Total stations in DB          : ${total_stations}`);

  // By state
  const byState = await q(`SELECT state, COUNT(*)::int AS cnt FROM "Station" GROUP BY state ORDER BY cnt DESC`);
  console.log("\nStations by State:");
  byState.forEach(r => console.log(`  ${r.state.padEnd(20)} : ${r.cnt}`));

  // By agency
  const byAgency = await q(`SELECT agency, COUNT(*)::int AS cnt FROM "Station" GROUP BY agency ORDER BY cnt DESC LIMIT 20`);
  console.log("\nTop Agencies:");
  byAgency.forEach(r => console.log(`  ${String(r.agency).padEnd(40)} : ${r.cnt}`));

  // Active vs inactive
  const [{ active, inactive }] = await q(`
    SELECT 
      SUM(CASE WHEN "isActive" = true THEN 1 ELSE 0 END)::int AS active,
      SUM(CASE WHEN "isActive" = false THEN 1 ELSE 0 END)::int AS inactive
    FROM "Station"
  `);
  console.log(`\nActive stations               : ${active}`);
  console.log(`Inactive stations             : ${inactive}`);

  // Duplicate detection: same name + agency (ignoring coords) 
  const dupsByNameAgency = await q(`
    SELECT "stationName", agency, COUNT(*)::int AS cnt 
    FROM "Station" 
    GROUP BY "stationName", agency 
    HAVING COUNT(*) > 1 
    ORDER BY cnt DESC 
    LIMIT 20
  `);
  console.log(`\nDuplicate (stationName, agency) groups : ${dupsByNameAgency.length}`);
  if (dupsByNameAgency.length > 0) {
    dupsByNameAgency.slice(0, 5).forEach(r =>
      console.log(`  "${r.stationName}" / ${r.agency} → ${r.cnt} rows`)
    );
  }

  // Duplicate detection: same name + agency + coords (exact DB unique key)
  const dupsByUniqueKey = await q(`
    SELECT "stationName", agency, latitude, longitude, COUNT(*)::int AS cnt 
    FROM "Station" 
    GROUP BY "stationName", agency, latitude, longitude 
    HAVING COUNT(*) > 1 
    ORDER BY cnt DESC 
    LIMIT 10
  `);
  console.log(`\nDuplicate unique-key groups (name+agency+lat+lng): ${dupsByUniqueKey.length}`);

  // ─── SECTION 2: READING COUNT VALIDATION ─────────────────────────────────
  console.log("\n=== SECTION 2: READING COUNT VALIDATION ===\n");

  const [{ total_readings }] = await q(`SELECT COUNT(*)::int AS total_readings FROM "GroundwaterReading"`);
  console.log(`Total readings in DB          : ${total_readings}`);

  // Readings per station stats
  const readingStats = await q(`
    SELECT 
      MIN(cnt)::int AS min_readings,
      MAX(cnt)::int AS max_readings,
      AVG(cnt)::numeric(10,1) AS avg_readings,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY cnt) AS median_readings
    FROM (SELECT "stationId", COUNT(*) AS cnt FROM "GroundwaterReading" GROUP BY "stationId") sub
  `);
  console.log(`Min readings/station          : ${readingStats[0].min_readings}`);
  console.log(`Max readings/station          : ${readingStats[0].max_readings}`);
  console.log(`Avg readings/station          : ${readingStats[0].avg_readings}`);
  console.log(`Median readings/station       : ${readingStats[0].median_readings}`);

  // Duplicate readings check (same stationId + timestamp)
  const dupReadings = await q(`
    SELECT COUNT(*)::int AS dup_groups FROM (
      SELECT "stationId", timestamp, COUNT(*) 
      FROM "GroundwaterReading" 
      GROUP BY "stationId", timestamp 
      HAVING COUNT(*) > 1
    ) sub
  `);
  console.log(`\nDuplicate reading groups      : ${dupReadings[0].dup_groups}`);

  // Anomaly + imputed stats
  const [readingQuality] = await q(`
    SELECT 
      SUM(CASE WHEN "isAnomaly" = true THEN 1 ELSE 0 END)::int AS anomalies,
      SUM(CASE WHEN "isImputed" = true THEN 1 ELSE 0 END)::int AS imputed,
      SUM(CASE WHEN "rawWaterLevel" IS NULL THEN 1 ELSE 0 END)::int AS null_raw
    FROM "GroundwaterReading"
  `);
  console.log(`Anomaly-flagged readings      : ${readingQuality.anomalies}`);
  console.log(`Imputed readings              : ${readingQuality.imputed}`);
  console.log(`NULL rawWaterLevel readings   : ${readingQuality.null_raw}`);

  // Date range of readings
  const [dateRange] = await q(`
    SELECT MIN(timestamp) AS earliest, MAX(timestamp) AS latest FROM "GroundwaterReading"
  `);
  console.log(`Earliest reading              : ${dateRange.earliest}`);
  console.log(`Latest reading                : ${dateRange.latest}`);

  // Readings by data source
  const bySource = await q(`
    SELECT "dataSource", COUNT(*)::int AS cnt FROM "GroundwaterReading" GROUP BY "dataSource"
  `);
  console.log("\nReadings by dataSource:");
  bySource.forEach(r => console.log(`  ${r.datasource}: ${r.cnt}`));

  // ─── SECTION 3: STATION ID MISMATCH ──────────────────────────────────────
  console.log("\n=== SECTION 3: STATION ID MISMATCH ===\n");

  const [{ distinct_station_ids_in_readings }] = await q(`
    SELECT COUNT(DISTINCT "stationId")::int AS distinct_station_ids_in_readings FROM "GroundwaterReading"
  `);
  console.log(`Distinct stationIds in readings: ${distinct_station_ids_in_readings}`);
  console.log(`Stations in Station table     : ${total_stations}`);
  console.log(`Difference                    : ${distinct_station_ids_in_readings - total_stations}`);

  // Orphan readings: readings with stationId NOT in Station table
  const orphans = await q(`
    SELECT COUNT(*)::int AS orphan_readings 
    FROM "GroundwaterReading" gr
    WHERE NOT EXISTS (SELECT 1 FROM "Station" s WHERE s.id = gr."stationId")
  `);
  console.log(`\nOrphan readings (no Station)  : ${orphans[0].orphan_readings}`);

  // Stations with NO readings
  const [{ stations_with_no_readings }] = await q(`
    SELECT COUNT(*)::int AS stations_with_no_readings
    FROM "Station" s
    WHERE NOT EXISTS (SELECT 1 FROM "GroundwaterReading" gr WHERE gr."stationId" = s.id)
  `);
  console.log(`Stations with zero readings   : ${stations_with_no_readings}`);

  // ─── SECTION 4: COORDINATE ANALYSIS ──────────────────────────────────────
  console.log("\n=== SECTION 4: COORDINATE ANALYSIS ===\n");

  // Missing / zero coordinates
  const [{ missing_coords }] = await q(`
    SELECT COUNT(*)::int AS missing_coords FROM "Station" WHERE latitude = 0 OR longitude = 0 OR latitude IS NULL OR longitude IS NULL
  `);
  console.log(`Missing/zero coordinates      : ${missing_coords}`);

  // Out-of-India coordinates
  const [{ out_of_bounds }] = await q(`
    SELECT COUNT(*)::int AS out_of_bounds FROM "Station" 
    WHERE latitude < 6 OR latitude > 38 OR longitude < 67 OR longitude > 98
  `);
  console.log(`Out-of-India coordinates      : ${out_of_bounds}`);

  // Same coords, different station names (potential dups)
  const dupCoords = await q(`
    SELECT latitude, longitude, COUNT(DISTINCT "stationName")::int AS name_variants, COUNT(*)::int AS total_rows
    FROM "Station"
    GROUP BY latitude, longitude
    HAVING COUNT(DISTINCT "stationName") > 1
    ORDER BY total_rows DESC
    LIMIT 10
  `);
  console.log(`\nSame coordinates, different names: ${dupCoords.length} groups`);
  dupCoords.slice(0, 5).forEach(r =>
    console.log(`  (${r.latitude}, ${r.longitude}) → ${r.name_variants} distinct names, ${r.total_rows} rows`)
  );

  // Same name, different coordinates
  const dupNames = await q(`
    SELECT "stationName", agency, COUNT(DISTINCT (ROUND(latitude::numeric,4), ROUND(longitude::numeric,4)))::int AS coord_variants
    FROM "Station"
    GROUP BY "stationName", agency
    HAVING COUNT(DISTINCT (ROUND(latitude::numeric,4), ROUND(longitude::numeric,4))) > 1
    ORDER BY coord_variants DESC
    LIMIT 10
  `);
  console.log(`\nSame name+agency, different coordinates: ${dupNames.length} groups`);
  dupNames.slice(0, 5).forEach(r =>
    console.log(`  "${r.stationName}" / ${r.agency} → ${r.coord_variants} coordinate variants`)
  );

  // ─── SECTION 5: DISTRICT DISTRIBUTION ────────────────────────────────────
  console.log("\n=== SECTION 5: DISTRICT DISTRIBUTION ===\n");

  const byDistrict = await q(`
    SELECT district, COUNT(*)::int AS station_count 
    FROM "Station"
    GROUP BY district 
    ORDER BY station_count DESC
    LIMIT 40
  `);
  console.log("Station count by district (top 40):");
  byDistrict.forEach(r =>
    console.log(`  ${r.district.padEnd(25)} : ${r.station_count}`)
  );

  // Total districts
  const [{ distinct_districts }] = await q(`SELECT COUNT(DISTINCT district)::int AS distinct_districts FROM "Station"`);
  console.log(`\nDistinct districts in DB      : ${distinct_districts}`);

  // AssessmentUnit coverage
  const [{ mapped, unmapped }] = await q(`
    SELECT 
      SUM(CASE WHEN "assessmentUnitId" IS NOT NULL THEN 1 ELSE 0 END)::int AS mapped,
      SUM(CASE WHEN "assessmentUnitId" IS NULL THEN 1 ELSE 0 END)::int AS unmapped
    FROM "Station"
  `);
  console.log(`\nAssessmentUnit mapped         : ${mapped}`);
  console.log(`AssessmentUnit unmapped       : ${unmapped}`);

  // ─── SECTION 6: SUMMARY ──────────────────────────────────────────────────
  console.log("\n=== SECTION 6: SUMMARY ===\n");

  // Stations by state cross-check
  const mahaOnly = await q(`SELECT COUNT(*)::int AS cnt FROM "Station" WHERE LOWER(state) LIKE '%maharashtra%'`);
  console.log(`Maharashtra stations only     : ${mahaOnly[0].cnt}`);

  // Unique station identifier (stationName + agency) vs DB rows
  const [{ unique_identities }] = await q(`
    SELECT COUNT(DISTINCT ("stationName" || '|' || agency))::int AS unique_identities FROM "Station"
  `);
  console.log(`Unique (name+agency) combos   : ${unique_identities}`);
  console.log(`Total Station rows            : ${total_stations}`);
  console.log(`Identity collisions possible  : ${total_stations - unique_identities}`);

  // Readings per year
  console.log("\nReadings per year:");
  const byYear = await q(`
    SELECT EXTRACT(YEAR FROM timestamp)::int AS yr, COUNT(*)::int AS cnt
    FROM "GroundwaterReading"
    GROUP BY yr
    ORDER BY yr
  `);
  byYear.forEach(r => console.log(`  ${r.yr}: ${r.cnt.toLocaleString()}`));

  console.log("\n============================================================");
  console.log("  AUDIT COMPLETE");
  console.log("============================================================\n");

  await p.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await p.$disconnect();
});
