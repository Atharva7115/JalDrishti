import { PrismaClient } from "@prisma/client";
import { resolveStationAssessmentUnit } from "../services/adminBoundaryResolver.service.js";

const p = new PrismaClient();

async function main() {
  const unmapped = await p.station.findMany({
    where: { assessmentUnitId: null }
  });
  console.log(`Remaining unmapped: ${unmapped.length}`);
  
  const mapped = await p.station.findMany({
    where: { NOT: { assessmentUnitId: null } },
    include: { assessmentUnit: true }
  });

  const detailed = [];
  for (const s of unmapped) {
    const res = await resolveStationAssessmentUnit(s, mapped);
    detailed.push({
      id: s.id,
      name: s.stationName,
      district: s.district,
      tehsil: s.tehsil,
      block: s.block,
      detectedDistrict: res.detectedDistrict || null,
      detectedTaluka: res.detectedTaluka || null,
      reason: res.reason,
      method: res.method || null
    });
  }

  // Count by reason
  const counts = {};
  for (const item of detailed) {
    const key = `${item.reason} | Detected Taluka: ${item.detectedTaluka} | District: ${item.district}`;
    counts[key] = (counts[key] || 0) + 1;
  }

  console.log("\nSummary of reasons:\n");
  for (const [key, count] of Object.entries(counts).sort((a,b) => b[1] - a[1])) {
    console.log(`  ${key}: ${count}`);
  }

  console.log("\nFull List of unmapped stations:\n");
  console.log(JSON.stringify(detailed, null, 2));

  await p.$disconnect();
}

main().catch(console.error);
