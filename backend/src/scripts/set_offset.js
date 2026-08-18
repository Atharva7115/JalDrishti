/**
 * Sets the ingestion checkpoint to a specific offset.
 * Run with: node src/scripts/set_offset.js 591000
 */
import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();
const targetOffset = parseInt(process.argv[2] || "591000", 10);

// Find the latest log (any status)
const latest = await p.ingestionLog.findFirst({
  orderBy: { startedAt: "desc" },
});

if (!latest) {
  console.log("❌ No ingestion log found.");
  await p.$disconnect();
  process.exit(1);
}

console.log("Current log:");
console.log(`  ID        : ${latest.id}`);
console.log(`  Status    : ${latest.status}`);
console.log(`  lastOffset: ${latest.lastOffset}`);
console.log(`  Fetched   : ${latest.recordsFetched}`);
console.log(`  Message   : ${latest.message}`);

// Force it to RUNNING at the target offset so ingestion resumes from there
await p.ingestionLog.update({
  where: { id: latest.id },
  data: {
    status: "RUNNING",
    completedAt: null,
    lastOffset: targetOffset,
    recordsFetched: targetOffset,   // approximate — avoids % going backwards
    message: `Manually reset to offset ${targetOffset} for resume.`,
  },
});

console.log(`\n✅ Checkpoint updated → offset ${targetOffset}`);
console.log("   Trigger ingestion now: POST /api/ingestion/start");

await p.$disconnect();
