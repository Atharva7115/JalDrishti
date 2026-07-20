import prisma from "../config/database.js";

export const findReading = async (stationId, timestamp) => {
  return await prisma.groundwaterReading.findUnique({
    where: {
      stationId_timestamp: {
        stationId,
        timestamp,
      },
    },
  });
};

export const createReading = async (readingData) => {
  return await prisma.groundwaterReading.create({
    data: readingData,
  });
};

export const findOrCreateReading = async (readingData) => {
  const existingReading = await findReading(
    readingData.stationId,
    readingData.timestamp
  );

  if (existingReading) {
    return {
      reading: existingReading,
      created: false,
    };
  }

  const newReading = await createReading(readingData);

  return {
    reading: newReading,
    created: true,
  };
};