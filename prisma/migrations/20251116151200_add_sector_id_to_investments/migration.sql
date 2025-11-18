-- AlterTable
ALTER TABLE "Investment" ADD COLUMN "sectorId" INTEGER;

-- CreateIndex
CREATE INDEX "Investment_sectorId_idx" ON "Investment"("sectorId");
