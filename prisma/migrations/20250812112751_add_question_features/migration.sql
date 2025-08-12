-- AlterTable
ALTER TABLE "public"."VariableQuestion" ADD COLUMN     "evidenceDescription" TEXT,
ADD COLUMN     "groupId" TEXT,
ADD COLUMN     "isGroupLead" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "requiresEvidence" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "VariableQuestion_groupId_idx" ON "public"."VariableQuestion"("groupId");
