/**
 * Business validation script — calls recharge + classify for 5 cross-district stations
 */
import { PrismaClient } from "@prisma/client";

const BASE = "http://localhost:5000";
const prisma = new PrismaClient();

async function get(url) {
  const r = await fetch(url);
  const body = await r.json().catch(() => ({}));
  return { status: r.status, body };
}

async function post(url) {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
  const body = await r.json().catch(() => ({}));
  return { status: r.status, body };
}

async function main() {
  // Fetch one station per distinct district that is now mapped
  const all = await prisma.station.findMany({
    where: { assessmentUnitId: { not: null } },
    include: { assessmentUnit: true },
    orderBy: { district: "asc" },
  });

  // Pick one per district, max 6
  const seen = new Set();
  const picks = [];
  for (const s of all) {
    if (!seen.has(s.district)) { seen.add(s.district); picks.push(s); }
    if (picks.length >= 6) break;
  }

  await prisma.$disconnect();

  console.log("\n============================================================");
  console.log("  Phase 6 — Business Validation");
  console.log("============================================================");

  const results = [];

  for (const s of picks) {
    process.stdout.write(`\n  Station: ${s.stationName} [${s.district}/${s.assessmentUnit?.taluka}]\n`);

    // 1. GET station detail
    const detail = await get(`${BASE}/stations/${s.id}`);
    const stData = detail.body?.data;
    const au = stData?.assessmentUnit;
    console.log(`    GET /stations/:id      → HTTP ${detail.status} | assessmentUnit: ${au ? `${au.district}/${au.taluka} (id=${au.id.slice(0,8)}...)` : "NULL"}`);

    // 2. POST recharge
    const recharge = await post(`${BASE}/stations/${s.id}/recharge`);
    const rechargeOk = recharge.status < 400 || (recharge.body?.message && !recharge.body.message.includes("not found"));
    console.log(`    POST /recharge         → HTTP ${recharge.status} | ${recharge.body?.message || JSON.stringify(recharge.body).slice(0,80)}`);

    // 3. POST classify
    const classify = await post(`${BASE}/stations/${s.id}/classify`);
    console.log(`    POST /classify         → HTTP ${classify.status} | ${classify.body?.message || JSON.stringify(classify.body).slice(0,80)}`);

    results.push({
      name: s.stationName,
      district: s.district,
      taluka: s.assessmentUnit?.taluka,
      auId: s.assessmentUnitId,
      detailHttp: detail.status,
      rechargeHttp: recharge.status,
      classifyHttp: classify.status,
    });
  }

  console.log("\n============================================================");
  console.log("  Summary Table");
  console.log("============================================================");
  console.log(`  ${"Station".padEnd(28)} ${"District".padEnd(14)} ${"Taluka".padEnd(18)} Detail  Recharge  Classify`);
  console.log(`  ${"-".repeat(90)}`);
  for (const r of results) {
    console.log(`  ${r.name.padEnd(28)} ${r.district.padEnd(14)} ${(r.taluka||"").padEnd(18)} ${String(r.detailHttp).padEnd(8)} ${String(r.rechargeHttp).padEnd(10)} ${r.classifyHttp}`);
  }
  console.log("============================================================\n");
}

main().catch(console.error);
