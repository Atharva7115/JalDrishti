import { PrismaClient } from "@prisma/client";
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
