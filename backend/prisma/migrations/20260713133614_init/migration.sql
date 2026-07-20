-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'RESEARCHER', 'GOVERNMENT', 'PUBLIC');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "IngestionStatus" AS ENUM ('SUCCESS', 'FAILED', 'PARTIAL');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'PUBLIC',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Station" (
    "id" TEXT NOT NULL,
    "stationName" TEXT NOT NULL,
    "agency" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "stateLGDCode" TEXT,
    "district" TEXT NOT NULL,
    "districtLGDCode" TEXT,
    "tehsil" TEXT,
    "block" TEXT,
    "village" TEXT,
    "river" TEXT,
    "basin" TEXT,
    "tributary" TEXT,
    "subTributary" TEXT,
    "subSubTributary" TEXT,
    "localRiver" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "rlMsl" DOUBLE PRECISION,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Station_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GroundwaterReading" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "rawWaterLevel" DOUBLE PRECISION NOT NULL,
    "cleanedWaterLevel" DOUBLE PRECISION,
    "isAnomaly" BOOLEAN NOT NULL DEFAULT false,
    "isImputed" BOOLEAN NOT NULL DEFAULT false,
    "dataSource" TEXT NOT NULL DEFAULT 'NWDP',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GroundwaterReading_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Forecast" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "forecastTime" TIMESTAMP(3) NOT NULL,
    "predictedLevel" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION,
    "modelName" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Forecast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RechargeResult" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "periodStart" TIMESTAMP(3) NOT NULL,
    "periodEnd" TIMESTAMP(3) NOT NULL,
    "recharge" DOUBLE PRECISION NOT NULL,
    "deltaWaterLevel" DOUBLE PRECISION NOT NULL,
    "specificYield" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RechargeResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IngestionLog" (
    "id" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "recordsFetched" INTEGER NOT NULL,
    "recordsInserted" INTEGER NOT NULL,
    "status" "IngestionStatus" NOT NULL,
    "message" TEXT,

    CONSTRAINT "IngestionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Station_stationName_agency_latitude_longitude_key" ON "Station"("stationName", "agency", "latitude", "longitude");

-- CreateIndex
CREATE INDEX "GroundwaterReading_stationId_idx" ON "GroundwaterReading"("stationId");

-- CreateIndex
CREATE INDEX "GroundwaterReading_timestamp_idx" ON "GroundwaterReading"("timestamp");

-- CreateIndex
CREATE INDEX "GroundwaterReading_stationId_timestamp_idx" ON "GroundwaterReading"("stationId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "GroundwaterReading_stationId_timestamp_key" ON "GroundwaterReading"("stationId", "timestamp");

-- CreateIndex
CREATE INDEX "Forecast_stationId_idx" ON "Forecast"("stationId");

-- CreateIndex
CREATE UNIQUE INDEX "Forecast_stationId_forecastTime_modelName_key" ON "Forecast"("stationId", "forecastTime", "modelName");

-- CreateIndex
CREATE INDEX "RechargeResult_stationId_idx" ON "RechargeResult"("stationId");

-- AddForeignKey
ALTER TABLE "GroundwaterReading" ADD CONSTRAINT "GroundwaterReading_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Forecast" ADD CONSTRAINT "Forecast_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RechargeResult" ADD CONSTRAINT "RechargeResult_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Alert" ADD CONSTRAINT "Alert_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;
