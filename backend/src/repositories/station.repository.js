import prisma from "../config/database.js";

export const findStation = async (stationData) => {
  return await prisma.station.findUnique({
    where: {
      stationName_agency_latitude_longitude: {
        stationName: stationData.stationName,
        agency: stationData.agency,
        latitude: stationData.latitude,
        longitude: stationData.longitude,
      },
    },
  });
};

export const createStation = async (stationData) => {
  return await prisma.station.create({
    data: stationData,
  });
};

export const findOrCreateStation = async (stationData) => {
  const existingStation = await findStation(stationData);

  if (existingStation) {
    return {
      station: existingStation,
      created: false,
    };
  }

  const newStation = await createStation(stationData);

  return {
    station: newStation,
    created: true,
  };
};