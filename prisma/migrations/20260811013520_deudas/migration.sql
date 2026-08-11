-- CreateTable
CREATE TABLE "debt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "person" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "settledCents" INTEGER NOT NULL DEFAULT 0,
    "date" DATETIME NOT NULL,
    "originId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "debt_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "debt_originId_fkey" FOREIGN KEY ("originId") REFERENCES "transaction" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_transaction" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "recurringId" TEXT,
    "periodKey" TEXT,
    "debtId" TEXT,
    CONSTRAINT "transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "transaction_recurringId_fkey" FOREIGN KEY ("recurringId") REFERENCES "recurring_rule" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "transaction_debtId_fkey" FOREIGN KEY ("debtId") REFERENCES "debt" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_transaction" ("amountCents", "createdAt", "date", "description", "id", "periodKey", "recurringId", "type", "updatedAt", "userId") SELECT "amountCents", "createdAt", "date", "description", "id", "periodKey", "recurringId", "type", "updatedAt", "userId" FROM "transaction";
DROP TABLE "transaction";
ALTER TABLE "new_transaction" RENAME TO "transaction";
CREATE INDEX "transaction_userId_date_idx" ON "transaction"("userId", "date");
CREATE UNIQUE INDEX "transaction_recurringId_periodKey_key" ON "transaction"("recurringId", "periodKey");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "debt_userId_direction_idx" ON "debt"("userId", "direction");
