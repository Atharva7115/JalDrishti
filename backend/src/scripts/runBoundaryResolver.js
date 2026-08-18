/**
 * runBoundaryResolver.js
 * One-time migration script — run with:
 *   node src/scripts/runBoundaryResolver.js            (dry run)
 *   node src/scripts/runBoundaryResolver.js --live     (writes to DB)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { resolveAllUnmappedStations } from "../services/adminBoundaryResolver.service.js";
import prisma from "../config/database.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dryRun = !process.argv.includes("--live");

async function main() {
  const beforeStats = await prisma.station.aggregate({
    _count: { id: true },
    where: { assessmentUnitId: null },
  });
  const beforeMapped = await prisma.station.count({
    where: { assessmentUnitId: { not: null } },
  });
  const beforeTotal = await prisma.station.count();

  console.log("\n====================================================");
  console.log("  JalDrishti — Admin Boundary Migration");
  console.log("====================================================");
  console.log("BEFORE:");
  console.log(`  Total stations   : ${beforeTotal}`);
  console.log(`  Mapped           : ${beforeMapped}`);
  console.log(`  Unmapped         : ${beforeStats._count.id}`);
  console.log("====================================================\n");

  const results = await resolveAllUnmappedStations({ dryRun });

  const afterUnmapped = await prisma.station.count({
    where: { assessmentUnitId: null },
  });
  const afterMapped = await prisma.station.count({
    where: { assessmentUnitId: { not: null } },
  });

  console.log("\n====================================================");
  console.log("  AFTER:");
  console.log(`  Total stations   : ${beforeTotal}`);
  console.log(`  Mapped           : ${afterMapped}`);
  console.log(`  Unmapped         : ${afterUnmapped}`);
  console.log("====================================================");

  // Write detailed report
  const reportPath = path.join(
    __dirname,
    "../../..",
    "C:\\Users\\HP\\.gemini\\antigravity-ide\\brain\\8a996869-dc51-451a-af87-a9a3b04c3dc5\\MIGRATION_RESULTS.md"
  );

  let md = `# Admin Boundary Migration Results\n\n`;
  md += `**Mode**: ${dryRun ? "DRY RUN (no DB changes)" : "LIVE RUN (DB updated)"}\n\n`;
  md += `## Before / After\n\n`;
  md += `| Metric | Before | After |\n|---|---|---|\n`;
  md += `| Total Stations | ${beforeTotal} | ${beforeTotal} |\n`;
  md += `| Mapped | ${beforeMapped} | ${afterMapped} |\n`;
  md += `| Unmapped | ${beforeStats._count.id} | ${afterUnmapped} |\n\n`;
  md += `## Resolution Statistics\n\n`;
  md += `| Metric | Count |\n|---|---|\n`;
  md += `| Processed | ${results.processed} |\n`;
  md += `| Resolved | ${results.resolved} |\n`;
  md += `| Failed | ${results.failed} |\n\n`;
  md += `## By Method\n\n`;
  md += `| Method | Count |\n|---|---|\n`;
  for (const [method, count] of Object.entries(results.byMethod)) {
    md += `| ${method} | ${count} |\n`;
  }
  md += `\n## Successful Resolutions\n\n`;
  md += `| Station | District | Detected Taluka | Method | Confidence |\n|---|---|---|---|---|\n`;
  for (const s of results.successes) {
    md += `| **${s.stationName}** | ${s.district} | ${s.detectedTaluka} | ${s.method} | ${s.confidence} |\n`;
  }
  md += `\n## Unresolved Stations (${results.failures.length})\n\n`;
  md += `| Station | District | Latitude | Longitude | Reason |\n|---|---|---|---|---|\n`;
  for (const s of results.failures) {
    md += `| **${s.stationName}** | ${s.district} | ${s.lat} | ${s.lng} | ${s.reason} |\n`;
  }

  // Write to a local accessible path
  const localReportPath = path.join(__dirname, "../../migration_results.md");
  fs.writeFileSync(localReportPath, md, "utf-8");
  console.log(`\nReport written to: ${localReportPath}`);

  await prisma.$disconnect();
}

main().catch(console.error);
