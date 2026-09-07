-- CreateTable
CREATE TABLE "RainfallReading" (
    "id" TEXT NOT NULL,
    "stationId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "rainfallMm" DOUBLE PRECISION NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'IMD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RainfallReading_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RainfallReading_stationId_idx" ON "RainfallReading"("stationId");

-- CreateIndex
CREATE INDEX "RainfallReading_date_idx" ON "RainfallReading"("date");

-- CreateIndex
CREATE UNIQUE INDEX "RainfallReading_stationId_date_key" ON "RainfallReading"("stationId", "date");

-- AddForeignKey
ALTER TABLE "RainfallReading" ADD CONSTRAINT "RainfallReading_stationId_fkey" FOREIGN KEY ("stationId") REFERENCES "Station"("id") ON DELETE CASCADE ON UPDATE CASCADE;
