-- CreateEnum
CREATE TYPE "AssessmentCategory" AS ENUM ('SAFE', 'SEMI_CRITICAL', 'CRITICAL', 'OVER_EXPLOITED');

-- AlterTable
ALTER TABLE "Station" ADD COLUMN     "aquiferTypeId" TEXT,
ADD COLUMN     "assessmentUnitId" TEXT;

-- CreateTable
CREATE TABLE "AquiferType" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "geologyCode" TEXT,
    "description" TEXT,
    "specificYield" DOUBLE PRECISION NOT NULL,
    "minSpecificYield" DOUBLE PRECISION NOT NULL,
    "maxSpecificYield" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AquiferType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentUnit" (
    "id" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "district" TEXT NOT NULL,
    "taluka" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentData" (
    "id" TEXT NOT NULL,
    "assessmentUnitId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "annualRecharge" DOUBLE PRECISION NOT NULL,
    "annualExtraction" DOUBLE PRECISION NOT NULL,
    "stageOfExtraction" DOUBLE PRECISION NOT NULL,
    "area" DOUBLE PRECISION,
    "category" "AssessmentCategory" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssessmentData_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AquiferType_name_key" ON "AquiferType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentUnit_state_district_taluka_key" ON "AssessmentUnit"("state", "district", "taluka");

-- CreateIndex
CREATE INDEX "AssessmentData_assessmentUnitId_idx" ON "AssessmentData"("assessmentUnitId");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentData_assessmentUnitId_year_key" ON "AssessmentData"("assessmentUnitId", "year");

-- AddForeignKey
ALTER TABLE "Station" ADD CONSTRAINT "Station_aquiferTypeId_fkey" FOREIGN KEY ("aquiferTypeId") REFERENCES "AquiferType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Station" ADD CONSTRAINT "Station_assessmentUnitId_fkey" FOREIGN KEY ("assessmentUnitId") REFERENCES "AssessmentUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentData" ADD CONSTRAINT "AssessmentData_assessmentUnitId_fkey" FOREIGN KEY ("assessmentUnitId") REFERENCES "AssessmentUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
