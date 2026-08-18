import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

async function main() {
  const [fStations, rStations] = await Promise.all([
    p.forecast.groupBy({ by: ["stationId"] }),
    p.rechargeResult.groupBy({ by: ["stationId"] })
  ]);
  console.log(`Unique stations with forecasts in DB: ${fStations.length}`);
  console.log(`Unique stations with recharge in DB : ${rStations.length}`);
  await p.$disconnect();
}

main().catch(console.error);
