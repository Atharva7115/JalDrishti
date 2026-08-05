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

async function seedAssessmentDataFromGsda(prismaInstance, csvPath = "gsda_matched_review.csv") {
  const fullPath = path.resolve(csvPath);
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️  ${fullPath} not found -- skipping GSDA AssessmentData seed.`);
    return;
  }

  const rows = parseCsv(fs.readFileSync(fullPath, "utf-8"));
  console.log(`🌱 Read ${rows.length} rows from ${csvPath}`);

  let imported = 0, skipped = 0;
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
    await seedAssessmentDataPlaceholder(prismaInstance, {
      assessmentUnitId: row.assessment_unit_id,
      year: REPORT_YEAR,
      annualRecharge: Number(row.annual_recharge_ham),
      annualExtraction: Number(row.annual_extraction_ham),
      stageOfExtraction: Number(row.stage_of_extraction_pct),
      area: row.area_ha ? Number(row.area_ha) * 10000 : null,
      category,
    });
    imported++;
  }
  console.log(`✅ Imported ${imported} AssessmentData records (skipped ${skipped}).`);
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