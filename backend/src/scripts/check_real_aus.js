import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();

async function main() {
  const districts = ["Raigad", "Raigarh", "Buldana", "Buldhana", "Pune"];
  const aus = await p.assessmentUnit.findMany({
    where: {
      district: {
        in: districts,
        mode: "insensitive"
      }
    }
  });
  console.log(JSON.stringify(aus.map(a => ({ id: a.id, district: a.district, taluka: a.taluka })), null, 2));
  await p.$disconnect();
}

main().catch(console.error);
