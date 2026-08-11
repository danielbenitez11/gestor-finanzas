-- CreateTable
CREATE TABLE "recurring_rule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "dayOfMonth" INTEGER NOT NULL,
    "startDate" DATETIME NOT NULL,
    "totalInstallments" INTEGER,
    "principalCents" INTEGER,
    "annualRateBp" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "cancelledAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "recurring_rule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
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
    CONSTRAINT "transaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "transaction_recurringId_fkey" FOREIGN KEY ("recurringId") REFERENCES "recurring_rule" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_transaction" ("amountCents", "createdAt", "date", "description", "id", "type", "updatedAt", "userId") SELECT "amountCents", "createdAt", "date", "description", "id", "type", "updatedAt", "userId" FROM "transaction";
DROP TABLE "transaction";
ALTER TABLE "new_transaction" RENAME TO "transaction";
CREATE INDEX "transaction_userId_date_idx" ON "transaction"("userId", "date");
CREATE UNIQUE INDEX "transaction_recurringId_periodKey_key" ON "transaction"("recurringId", "periodKey");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "recurring_rule_userId_active_idx" ON "recurring_rule"("userId", "active");
