-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "vector";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('STUDENT', 'ADVISOR', 'COORDINATOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "AdvanceStatus" AS ENUM ('PENDING', 'AI_PROCESSING', 'AI_COMPLETE', 'HUMAN_REVIEW', 'OBSERVED', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "FindingSeverity" AS ENUM ('CRITICAL', 'MAJOR', 'MINOR', 'SUGGESTION');

-- CreateEnum
CREATE TYPE "ThesisDocumentStatus" AS ENUM ('PENDING', 'GENERATING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "DocumentSchemaType" AS ENUM ('THESIS_PROJECT', 'SCIENTIFIC_ARTICLE', 'THESIS', 'THESIS_REPORT');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "orcidManual" TEXT,
    "role" "Role" NOT NULL,
    "programId" TEXT,
    "advisorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orcid_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "orcidId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "linkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orcid_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orcid_publications" (
    "id" TEXT NOT NULL,
    "orcidProfileId" TEXT NOT NULL,
    "putCode" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "doi" TEXT,
    "journal" TEXT,
    "year" INTEGER,
    "authors" JSONB NOT NULL DEFAULT '[]',
    "abstract" TEXT,
    "url" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orcid_publications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "programs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "programs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thesis_templates" (
    "id" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "fileKey" TEXT NOT NULL,
    "extractedSchema" JSONB NOT NULL,
    "rubric" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "thesis_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "template_chunks" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "sectionName" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,

    CONSTRAINT "template_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "advances" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "advanceType" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "fileKey" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "pageCount" INTEGER,
    "status" "AdvanceStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "advances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_analyses" (
    "id" TEXT NOT NULL,
    "advanceId" TEXT NOT NULL,
    "structureScore" DOUBLE PRECISION NOT NULL,
    "contentScore" DOUBLE PRECISION NOT NULL,
    "formScore" DOUBLE PRECISION NOT NULL,
    "originalityScore" DOUBLE PRECISION NOT NULL,
    "overallScore" DOUBLE PRECISION NOT NULL,
    "gradeConverted" DOUBLE PRECISION NOT NULL,
    "executiveSummary" TEXT NOT NULL,
    "processingMs" INTEGER NOT NULL,
    "modelUsed" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_findings" (
    "id" TEXT NOT NULL,
    "analysisId" TEXT NOT NULL,
    "sectionRef" TEXT NOT NULL,
    "pageRef" INTEGER,
    "severity" "FindingSeverity" NOT NULL,
    "description" TEXT NOT NULL,
    "correctionSteps" TEXT NOT NULL,
    "exampleImprovement" TEXT NOT NULL,
    "recommendation" TEXT NOT NULL,
    "humanAccepted" BOOLEAN,
    "humanComment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_findings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "advanceId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "finalGrade" DOUBLE PRECISION,
    "humanComment" TEXT,
    "rubricAnswers" JSONB NOT NULL DEFAULT '{}',
    "status" "AdvanceStatus" NOT NULL,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "advance_chunks" (
    "id" TEXT NOT NULL,
    "advanceId" TEXT NOT NULL,
    "programId" TEXT NOT NULL,
    "sectionName" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "chunkIndex" INTEGER NOT NULL,
    "embedding" vector(1536),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "advance_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plagiarism_reports" (
    "id" TEXT NOT NULL,
    "advanceId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "overallScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "method" TEXT NOT NULL,
    "analyzedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plagiarism_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "plagiarism_alerts" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "sectionName" TEXT NOT NULL,
    "similarity" DOUBLE PRECISION NOT NULL,
    "severity" TEXT NOT NULL,
    "sourceSnippet" TEXT,
    "targetSnippet" TEXT,
    "targetAdvanceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plagiarism_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reference_validations" (
    "id" TEXT NOT NULL,
    "advanceId" TEXT NOT NULL,
    "rawText" TEXT NOT NULL,
    "title" TEXT,
    "authors" TEXT,
    "year" INTEGER,
    "doi" TEXT,
    "journal" TEXT,
    "status" TEXT NOT NULL,
    "suggestion" TEXT,
    "crossrefData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reference_validations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_schemas" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "DocumentSchemaType" NOT NULL,
    "description" TEXT,
    "structure" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_schemas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "thesis_documents" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "authors" TEXT[],
    "advisor" TEXT NOT NULL,
    "lineOfResearch" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "documentType" "DocumentSchemaType" NOT NULL,
    "status" "ThesisDocumentStatus" NOT NULL DEFAULT 'PENDING',
    "outputFormats" TEXT[],
    "pdfKey" TEXT,
    "docxKey" TEXT,
    "metadata" JSONB,
    "userId" TEXT NOT NULL,
    "schemaId" TEXT,
    "sourceFileKey" TEXT,
    "sourceFileName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "thesis_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "advanceId" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_documentation" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "module" TEXT,
    "chunkIndex" INTEGER NOT NULL,
    "parentId" TEXT,
    "embedding" vector(1536),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_documentation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "orcid_profiles_userId_key" ON "orcid_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "orcid_profiles_orcidId_key" ON "orcid_profiles"("orcidId");

-- CreateIndex
CREATE INDEX "orcid_publications_orcidProfileId_idx" ON "orcid_publications"("orcidProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "orcid_publications_orcidProfileId_putCode_key" ON "orcid_publications"("orcidProfileId", "putCode");

-- CreateIndex
CREATE INDEX "advances_studentId_idx" ON "advances"("studentId");

-- CreateIndex
CREATE INDEX "advances_programId_status_idx" ON "advances"("programId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ai_analyses_advanceId_key" ON "ai_analyses"("advanceId");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_advanceId_key" ON "reviews"("advanceId");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_token_key" ON "refresh_tokens"("token");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_idx" ON "refresh_tokens"("userId");

-- CreateIndex
CREATE INDEX "refresh_tokens_token_idx" ON "refresh_tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_userId_key" ON "password_reset_tokens"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_key" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "password_reset_tokens_token_idx" ON "password_reset_tokens"("token");

-- CreateIndex
CREATE INDEX "advance_chunks_advanceId_idx" ON "advance_chunks"("advanceId");

-- CreateIndex
CREATE INDEX "advance_chunks_programId_idx" ON "advance_chunks"("programId");

-- CreateIndex
CREATE UNIQUE INDEX "plagiarism_reports_advanceId_key" ON "plagiarism_reports"("advanceId");

-- CreateIndex
CREATE INDEX "reference_validations_advanceId_idx" ON "reference_validations"("advanceId");

-- CreateIndex
CREATE INDEX "document_schemas_type_idx" ON "document_schemas"("type");

-- CreateIndex
CREATE INDEX "document_schemas_isActive_idx" ON "document_schemas"("isActive");

-- CreateIndex
CREATE INDEX "document_schemas_isDefault_idx" ON "document_schemas"("isDefault");

-- CreateIndex
CREATE INDEX "thesis_documents_userId_idx" ON "thesis_documents"("userId");

-- CreateIndex
CREATE INDEX "thesis_documents_status_idx" ON "thesis_documents"("status");

-- CreateIndex
CREATE INDEX "thesis_documents_schemaId_idx" ON "thesis_documents"("schemaId");

-- CreateIndex
CREATE INDEX "notifications_userId_readAt_idx" ON "notifications"("userId", "readAt");

-- CreateIndex
CREATE INDEX "notifications_userId_createdAt_idx" ON "notifications"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "project_documentation_source_idx" ON "project_documentation"("source");

-- CreateIndex
CREATE INDEX "project_documentation_module_idx" ON "project_documentation"("module");

-- CreateIndex
CREATE INDEX "audit_logs_userId_createdAt_idx" ON "audit_logs"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_entity_entityId_idx" ON "audit_logs"("entity", "entityId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_programId_fkey" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_advisorId_fkey" FOREIGN KEY ("advisorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orcid_profiles" ADD CONSTRAINT "orcid_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orcid_publications" ADD CONSTRAINT "orcid_publications_orcidProfileId_fkey" FOREIGN KEY ("orcidProfileId") REFERENCES "orcid_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thesis_templates" ADD CONSTRAINT "thesis_templates_programId_fkey" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "template_chunks" ADD CONSTRAINT "template_chunks_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "thesis_templates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advances" ADD CONSTRAINT "advances_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advances" ADD CONSTRAINT "advances_programId_fkey" FOREIGN KEY ("programId") REFERENCES "programs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advances" ADD CONSTRAINT "advances_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "thesis_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_analyses" ADD CONSTRAINT "ai_analyses_advanceId_fkey" FOREIGN KEY ("advanceId") REFERENCES "advances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_findings" ADD CONSTRAINT "ai_findings_analysisId_fkey" FOREIGN KEY ("analysisId") REFERENCES "ai_analyses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_advanceId_fkey" FOREIGN KEY ("advanceId") REFERENCES "advances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advance_chunks" ADD CONSTRAINT "advance_chunks_advanceId_fkey" FOREIGN KEY ("advanceId") REFERENCES "advances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plagiarism_reports" ADD CONSTRAINT "plagiarism_reports_advanceId_fkey" FOREIGN KEY ("advanceId") REFERENCES "advances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plagiarism_alerts" ADD CONSTRAINT "plagiarism_alerts_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "plagiarism_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plagiarism_alerts" ADD CONSTRAINT "plagiarism_alerts_targetAdvanceId_fkey" FOREIGN KEY ("targetAdvanceId") REFERENCES "advances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reference_validations" ADD CONSTRAINT "reference_validations_advanceId_fkey" FOREIGN KEY ("advanceId") REFERENCES "advances"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document_schemas" ADD CONSTRAINT "document_schemas_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "thesis_documents" ADD CONSTRAINT "thesis_documents_schemaId_fkey" FOREIGN KEY ("schemaId") REFERENCES "document_schemas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
