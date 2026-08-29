-- CreateTable
CREATE TABLE "TelemetryReading" (
    "id" BIGSERIAL NOT NULL,
    "tenantId" UUID NOT NULL,
    "deviceSerial" TEXT NOT NULL,
    "thermalBoxCode" TEXT,
    "temperatureC" DECIMAL(6,2),
    "humidityPct" DECIMAL(5,2),
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "batteryPct" INTEGER,
    "batteryMv" INTEGER,
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ingestedByUserId" UUID,
    "dedupeKey" TEXT NOT NULL,
    "extra" JSONB,

    CONSTRAINT "TelemetryReading_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TelemetryReading_tenantId_deviceSerial_recordedAt_idx" ON "TelemetryReading"("tenantId", "deviceSerial", "recordedAt");

-- CreateIndex
CREATE INDEX "TelemetryReading_tenantId_receivedAt_idx" ON "TelemetryReading"("tenantId", "receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TelemetryReading_tenantId_deviceSerial_dedupeKey_key" ON "TelemetryReading"("tenantId", "deviceSerial", "dedupeKey");

-- AddForeignKey
ALTER TABLE "TelemetryReading" ADD CONSTRAINT "TelemetryReading_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
