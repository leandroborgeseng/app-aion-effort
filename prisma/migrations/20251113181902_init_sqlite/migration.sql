-- CreateTable
CREATE TABLE "HttpCache" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "payload" BLOB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "RequestLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "qs" TEXT NOT NULL,
    "status" INTEGER NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "EquipmentFlag" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "effortId" INTEGER NOT NULL,
    "replaceFlag" BOOLEAN NOT NULL DEFAULT false,
    "replaceReason" TEXT,
    "replaceNotes" TEXT,
    "inspected" BOOLEAN NOT NULL DEFAULT false,
    "inspectedAt" DATETIME,
    "inspectedBy" TEXT,
    "substCost" DECIMAL,
    "substCostSource" TEXT,
    "eolDate" DATETIME,
    "eosDate" DATETIME,
    "anvisaReg" TEXT,
    "anvisaValidity" DATETIME,
    "criticalFlag" BOOLEAN NOT NULL DEFAULT false,
    "monitoredFlag" BOOLEAN NOT NULL DEFAULT false,
    "slaTargetAvailPct" INTEGER NOT NULL DEFAULT 98,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "EquipmentFlagAudit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "effortId" INTEGER NOT NULL,
    "field" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "actor" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "SectorRound" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sectorId" INTEGER NOT NULL,
    "sectorName" TEXT NOT NULL,
    "weekStart" DATETIME NOT NULL,
    "responsibleId" TEXT NOT NULL,
    "responsibleName" TEXT,
    "openOsCount" INTEGER NOT NULL DEFAULT 0,
    "closedOsCount" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "purchaseRequestIds" TEXT,
    "osIds" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "PurchaseRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sectorId" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "UserSector" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "sectorId" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "EquipmentKpiMonthly" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "effortId" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "availability" REAL NOT NULL,
    "slaAttendPct" REAL,
    "slaSolvePct" REAL,
    "mtbfHours" REAL,
    "mttrHours" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "MaintenanceContract" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nome" TEXT NOT NULL,
    "fornecedor" TEXT NOT NULL,
    "equipamentoIds" TEXT NOT NULL,
    "tipoContrato" TEXT NOT NULL,
    "valorAnual" DECIMAL NOT NULL,
    "dataInicio" DATETIME NOT NULL,
    "dataFim" DATETIME NOT NULL,
    "renovacaoAutomatica" BOOLEAN NOT NULL DEFAULT false,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "observacoes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Investment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "categoria" TEXT NOT NULL,
    "valorEstimado" DECIMAL NOT NULL,
    "prioridade" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "setor" TEXT,
    "responsavel" TEXT,
    "dataPrevista" DATETIME,
    "observacoes" TEXT,
    "sectorRoundId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Investment_sectorRoundId_fkey" FOREIGN KEY ("sectorRoundId") REFERENCES "SectorRound" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "effortId" INTEGER NOT NULL,
    "tag" TEXT NOT NULL,
    "equipamento" TEXT NOT NULL,
    "osCodigo" TEXT NOT NULL,
    "osCodigoSerial" INTEGER NOT NULL,
    "tipo" TEXT NOT NULL,
    "prioridade" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "dataAbertura" DATETIME NOT NULL,
    "situacao" TEXT NOT NULL,
    "visualizadaEm" DATETIME,
    "visualizadaPor" TEXT,
    "resolvidaEm" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentFlag_effortId_key" ON "EquipmentFlag"("effortId");

-- CreateIndex
CREATE INDEX "idx_equipmentflag_effortId" ON "EquipmentFlag"("effortId");

-- CreateIndex
CREATE INDEX "EquipmentFlag_criticalFlag_idx" ON "EquipmentFlag"("criticalFlag");

-- CreateIndex
CREATE INDEX "EquipmentFlag_monitoredFlag_idx" ON "EquipmentFlag"("monitoredFlag");

-- CreateIndex
CREATE INDEX "EquipmentFlagAudit_effortId_createdAt_idx" ON "EquipmentFlagAudit"("effortId", "createdAt");

-- CreateIndex
CREATE INDEX "SectorRound_weekStart_idx" ON "SectorRound"("weekStart");

-- CreateIndex
CREATE INDEX "SectorRound_sectorId_idx" ON "SectorRound"("sectorId");

-- CreateIndex
CREATE UNIQUE INDEX "SectorRound_sectorId_weekStart_key" ON "SectorRound"("sectorId", "weekStart");

-- CreateIndex
CREATE INDEX "EquipmentKpiMonthly_year_month_idx" ON "EquipmentKpiMonthly"("year", "month");

-- CreateIndex
CREATE UNIQUE INDEX "EquipmentKpiMonthly_effortId_year_month_key" ON "EquipmentKpiMonthly"("effortId", "year", "month");

-- CreateIndex
CREATE INDEX "MaintenanceContract_dataInicio_dataFim_idx" ON "MaintenanceContract"("dataInicio", "dataFim");

-- CreateIndex
CREATE INDEX "MaintenanceContract_ativo_idx" ON "MaintenanceContract"("ativo");

-- CreateIndex
CREATE INDEX "Investment_status_idx" ON "Investment"("status");

-- CreateIndex
CREATE INDEX "Investment_categoria_idx" ON "Investment"("categoria");

-- CreateIndex
CREATE INDEX "Investment_sectorRoundId_idx" ON "Investment"("sectorRoundId");

-- CreateIndex
CREATE INDEX "Investment_createdAt_idx" ON "Investment"("createdAt");

-- CreateIndex
CREATE INDEX "Alert_effortId_idx" ON "Alert"("effortId");

-- CreateIndex
CREATE INDEX "Alert_situacao_idx" ON "Alert"("situacao");

-- CreateIndex
CREATE INDEX "Alert_createdAt_idx" ON "Alert"("createdAt");
