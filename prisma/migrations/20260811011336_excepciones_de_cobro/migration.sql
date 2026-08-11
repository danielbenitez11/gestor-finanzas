-- CreateTable
CREATE TABLE "recurring_skip" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "recurringId" TEXT NOT NULL,
    "periodKey" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "recurring_skip_recurringId_fkey" FOREIGN KEY ("recurringId") REFERENCES "recurring_rule" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "recurring_skip_recurringId_periodKey_key" ON "recurring_skip"("recurringId", "periodKey");
