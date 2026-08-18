import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

async function main() {
  const stations = await p.station.findMany({
    where: {
      stationName: {
        in: ["Beldarpada", "Dhad_3", "Shivaji Nagar_1"]
      }
    }
  });
  console.log(JSON.stringify(stations, null, 2));
  await p.$disconnect();
}

main().catch(console.error);
