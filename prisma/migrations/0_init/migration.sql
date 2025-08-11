-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('SUPER_ADMIN', 'ORG_ADMIN', 'SURVEY_CREATOR', 'RESPONDENT', 'VIEWER');

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT,
    "role" "public"."Role" NOT NULL DEFAULT 'RESPONDENT',
    "organization" TEXT,
    "department" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLogin" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Survey" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Survey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Question" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "options" JSONB,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "category" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Response" (
    "id" TEXT NOT NULL,
    "surveyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "score" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Response_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Answer" (
    "id" TEXT NOT NULL,
    "responseId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "value" TEXT,
    "score" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Answer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Pillar" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "weightage" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Pillar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Lever" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "weightage" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "pillarId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lever_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Variable" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "weightage" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "parentId" TEXT,
    "level" INTEGER NOT NULL DEFAULT 0,
    "path" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "leverId" TEXT,
    "aggregationType" TEXT DEFAULT 'SUM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Variable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VariableQuestion" (
    "id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "options" JSONB,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "weightage" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "order" INTEGER NOT NULL,
    "formula" TEXT,
    "variableId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VariableQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "public"."User"("role");

-- CreateIndex
CREATE INDEX "Survey_createdById_idx" ON "public"."Survey"("createdById");

-- CreateIndex
CREATE INDEX "Survey_category_idx" ON "public"."Survey"("category");

-- CreateIndex
CREATE INDEX "Survey_isActive_isPublished_idx" ON "public"."Survey"("isActive", "isPublished");

-- CreateIndex
CREATE INDEX "Question_surveyId_idx" ON "public"."Question"("surveyId");

-- CreateIndex
CREATE UNIQUE INDEX "Question_surveyId_order_key" ON "public"."Question"("surveyId", "order");

-- CreateIndex
CREATE INDEX "Response_surveyId_idx" ON "public"."Response"("surveyId");

-- CreateIndex
CREATE INDEX "Response_userId_idx" ON "public"."Response"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Response_surveyId_userId_key" ON "public"."Response"("surveyId", "userId");

-- CreateIndex
CREATE INDEX "Answer_responseId_idx" ON "public"."Answer"("responseId");

-- CreateIndex
CREATE INDEX "Answer_questionId_idx" ON "public"."Answer"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "Answer_responseId_questionId_key" ON "public"."Answer"("responseId", "questionId");

-- CreateIndex
CREATE UNIQUE INDEX "Pillar_name_key" ON "public"."Pillar"("name");

-- CreateIndex
CREATE INDEX "Pillar_name_idx" ON "public"."Pillar"("name");

-- CreateIndex
CREATE INDEX "Pillar_isActive_idx" ON "public"."Pillar"("isActive");

-- CreateIndex
CREATE INDEX "Lever_pillarId_idx" ON "public"."Lever"("pillarId");

-- CreateIndex
CREATE INDEX "Lever_name_idx" ON "public"."Lever"("name");

-- CreateIndex
CREATE INDEX "Lever_isActive_idx" ON "public"."Lever"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Lever_pillarId_name_key" ON "public"."Lever"("pillarId", "name");

-- CreateIndex
CREATE INDEX "Variable_parentId_idx" ON "public"."Variable"("parentId");

-- CreateIndex
CREATE INDEX "Variable_leverId_idx" ON "public"."Variable"("leverId");

-- CreateIndex
CREATE INDEX "Variable_path_idx" ON "public"."Variable"("path");

-- CreateIndex
CREATE INDEX "Variable_level_idx" ON "public"."Variable"("level");

-- CreateIndex
CREATE INDEX "Variable_order_idx" ON "public"."Variable"("order");

-- CreateIndex
CREATE INDEX "Variable_name_idx" ON "public"."Variable"("name");

-- CreateIndex
CREATE INDEX "Variable_isActive_idx" ON "public"."Variable"("isActive");

-- CreateIndex
CREATE INDEX "VariableQuestion_variableId_idx" ON "public"."VariableQuestion"("variableId");

-- CreateIndex
CREATE INDEX "VariableQuestion_type_idx" ON "public"."VariableQuestion"("type");

-- CreateIndex
CREATE UNIQUE INDEX "VariableQuestion_variableId_order_key" ON "public"."VariableQuestion"("variableId", "order");

-- AddForeignKey
ALTER TABLE "public"."Survey" ADD CONSTRAINT "Survey_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Question" ADD CONSTRAINT "Question_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "public"."Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Response" ADD CONSTRAINT "Response_surveyId_fkey" FOREIGN KEY ("surveyId") REFERENCES "public"."Survey"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Response" ADD CONSTRAINT "Response_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Answer" ADD CONSTRAINT "Answer_responseId_fkey" FOREIGN KEY ("responseId") REFERENCES "public"."Response"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Answer" ADD CONSTRAINT "Answer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "public"."Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Lever" ADD CONSTRAINT "Lever_pillarId_fkey" FOREIGN KEY ("pillarId") REFERENCES "public"."Pillar"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Variable" ADD CONSTRAINT "Variable_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."Variable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Variable" ADD CONSTRAINT "Variable_leverId_fkey" FOREIGN KEY ("leverId") REFERENCES "public"."Lever"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VariableQuestion" ADD CONSTRAINT "VariableQuestion_variableId_fkey" FOREIGN KEY ("variableId") REFERENCES "public"."Variable"("id") ON DELETE CASCADE ON UPDATE CASCADE;