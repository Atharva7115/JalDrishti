import prisma from "../config/database.js";

import stationCache from "../utils/stationCache.js";

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

  const cacheKey = [
    stationData.stationName,
    stationData.agency,
    stationData.latitude,
    stationData.longitude,
  ].join("|");

  // -------------------------
  // Check Cache
  // -------------------------
  if (stationCache.has(cacheKey)) {
    return {
      station: stationCache.get(cacheKey),
      created: false,
      source: "CACHE",
    };
  }

  // -------------------------
  // Check Database
  // -------------------------
  const existingStation = await findStation(stationData);

  if (existingStation) {

    stationCache.set(cacheKey, existingStation);

    return {
      station: existingStation,
      created: false,
      source: "DATABASE",
    };
  }

  // -------------------------
  // Create New Station
  // -------------------------
  const newStation = await createStation(stationData);

  stationCache.set(cacheKey, newStation);

  return {
    station: newStation,
    created: true,
    source: "CREATED",
  };
};