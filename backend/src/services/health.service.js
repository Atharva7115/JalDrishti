import prisma from "../config/database.js";

export const healthCheck = async () => {
  await prisma.$queryRaw`SELECT 1`;

  return {
    success: true,
    status: "OK",
    database: "Connected",
    timestamp: new Date(),
  };
};