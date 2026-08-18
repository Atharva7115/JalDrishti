import { PrismaClient } from "@prisma/client";
import fs from "fs";
import path from "path";
import { seedAquifers } from "./seed/aquifer.seed.js";
import { seedAssessmentUnits } from "./seed/assessmentUnit.seed.js";
import { mapStations } from "./seed/stationMapping.seed.js";

const prisma = new PrismaClient();

/**
 * Part 6: AssessmentData Seed Placeholder
 * Accepts assessmentUnitId, year, annualRecharge, annualExtraction, stageOfExtraction, category, and area.
 * Upserts the record using the unique compound key (assessmentUnitId, year) to ensure no duplicate years.
 */
export const seedAssessmentDataPlaceholder = async (prismaInstance, data) => {
  console.log(`📌 Seeding AssessmentData placeholder for Unit ${data.assessmentUnitId}, Year ${data.year}...`);
  return await prismaInstance.assessmentData.upsert({
    where: {
      assessmentUnitId_year: {
        assessmentUnitId: data.assessmentUnitId,
        year: data.year,
      },
    },
    update: {
      annualRecharge: data.annualRecharge,
      annualExtraction: data.annualExtraction,
      stageOfExtraction: data.stageOfExtraction,
      category: data.category,
      area: data.area ?? null,
    },
    create: {
      assessmentUnitId: data.assessmentUnitId,
      year: data.year,
      annualRecharge: data.annualRecharge,
      annualExtraction: data.annualExtraction,
      stageOfExtraction: data.stageOfExtraction,
      category: data.category,
      area: data.area ?? null,
    },
  });
};

/**
 * Reads the GSDA-matched CSV (produced by ml-service's match_assessment_units.py)
 * and calls seedAssessmentDataPlaceholder for every row with status === "matched".
 * "review" and "unmatched" rows are skipped -- they need human confirmation or
 * simply have no station-derived AssessmentUnit to attach to yet.
 */
const CATEGORY_MAP = {
  safe: "SAFE",
  semi_critical: "SEMI_CRITICAL",
  critical: "CRITICAL",
  over_exploited: "OVER_EXPLOITED",
  // "salinity" has no matching enum value -- deliberately skipped below.
};

const REPORT_YEAR = 2023;

function parseCsv(content) {
  const lines = content.trim().split("\n");
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    const values = line.split(",");
    const row = {};
    headers.forEach((h, i) => (row[h] = (values[i] ?? "").trim()));
    return row;
  });
}

const DISTRICT_ALIASES = {
  "ahmednagar": "ahmadnagar",
  "buldhana": "buldana",
  "sindhudurg": "sindudurg",
  "yawatmal": "yavatmal",
};

async function seedAssessmentDataFromGsda(prismaInstance, csvPath = "gsda_matched_review.csv") {
  let fullPath = path.resolve(csvPath);
  console.log(`🔍 Checking for GSDA CSV at primary path: ${fullPath}`);

  if (!fs.existsSync(fullPath)) {
    const fallbackPath = path.resolve("../ml-service", csvPath);
    console.log(`⚠️  Primary path not found. Checking fallback path: ${fallbackPath}`);
    if (fs.existsSync(fallbackPath)) {
      fullPath = fallbackPath;
    } else {
      console.log(`❌ GSDA CSV file not found at either path -- skipping GSDA AssessmentData seed.`);
      return;
    }
  }

  console.log(`📂 Using GSDA CSV path: ${fullPath}`);
  const fileContent = fs.readFileSync(fullPath, "utf-8");
  const rows = parseCsv(fileContent);
  console.log(`🌱 Total rows read from CSV: ${rows.length}`);

  // Fetch all current AssessmentUnits from database to map names to actual UUIDs
  const units = await prismaInstance.assessmentUnit.findMany();
  const unitMap = new Map();
  units.forEach((u) => {
    const key = `maharashtra|${u.district.toLowerCase()}|${u.taluka.toLowerCase()}`;
    unitMap.set(key, u.id);
  });

  let matchedProcessed = 0;
  let imported = 0;
  let skipped = 0;

  for (const row of rows) {
    if (row.status !== "matched" || row.category_raw === "salinity") {
      skipped++;
      continue;
    }

    const category = CATEGORY_MAP[row.category_raw];
    if (!category) {
      skipped++;
      continue;
    }

    // Resolve AssessmentUnit ID dynamically
    const rawDistrict = row.district.toLowerCase();
    const mappedDistrict = DISTRICT_ALIASES[rawDistrict] || rawDistrict;
    const mappedTaluka = row.matched_taluka_in_db.toLowerCase();
    const key = `maharashtra|${mappedDistrict}|${mappedTaluka}`;
    const resolvedUnitId = unitMap.get(key);

    if (!resolvedUnitId) {
      console.log(`⚠️  Could not find active AssessmentUnit for ${row.district} / ${row.matched_taluka_in_db} in database (skipped).`);
      skipped++;
      continue;
    }

    matchedProcessed++;

    await seedAssessmentDataPlaceholder(prismaInstance, {
      assessmentUnitId: resolvedUnitId,
      year: REPORT_YEAR,
      // Convert ham to m3 by multiplying by 10,000
      annualRecharge: Number(row.annual_recharge_ham) * 10000,
      annualExtraction: Number(row.annual_extraction_ham) * 10000,
      stageOfExtraction: Number(row.stage_of_extraction_pct),
      area: row.area_ha ? Number(row.area_ha) * 10000 : null,
      category,
    });
    imported++;
  }

  const finalCount = await prismaInstance.assessmentData.count();

  console.log(`✅ Seeding complete:`);
  console.log(`  - Matched rows processed: ${matchedProcessed}`);
  console.log(`  - Rows successfully upserted: ${imported}`);
  console.log(`  - Rows skipped (unmatched/salinity/invalid/missing unit): ${skipped}`);
  console.log(`  - Final AssessmentData count in database: ${finalCount}`);
}

async function main() {
  try {
    console.log("🚀 Starting Database Seeding & Metadata Mapping Pipeline...\n");

    // 1. Seed Aquifer types with official Specific Yields
    await seedAquifers(prisma);
    console.log("");

    // 2. Scan stations and create unique Assessment Units
    await seedAssessmentUnits(prisma);
    console.log("");

    // 3. Map stations to their Aquifers and Assessment Units
    await mapStations(prisma);
    console.log("");

    // 4. Seed real AssessmentData from the GSDA GWRE-2023 report
    await seedAssessmentDataFromGsda(prisma);
    console.log("");

    console.log("🏁 Database seeding and station mapping pipeline completed successfully.");
  } catch (error) {
    console.error("❌ Database seeding pipeline failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Only execute main if run directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("seed.js")) {
  main();
}