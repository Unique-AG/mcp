-- CreateEnum
CREATE TYPE "public"."TokenType" AS ENUM ('ACCESS', 'REFRESH');

-- CreateTable
CREATE TABLE "public"."OAuthClient" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientSecret" TEXT,
    "clientName" TEXT NOT NULL,
    "clientDescription" TEXT,
    "logoUri" TEXT,
    "clientUri" TEXT,
    "developerName" TEXT,
    "developerEmail" TEXT,
    "redirectUris" TEXT[],
    "grantTypes" TEXT[],
    "responseTypes" TEXT[],
    "tokenEndpointAuthMethod" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OAuthClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuthorizationCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "redirectUri" TEXT NOT NULL,
    "codeChallenge" TEXT NOT NULL,
    "codeChallengeMethod" TEXT NOT NULL,
    "resource" TEXT,
    "scope" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "githubAccessToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userProfileId" TEXT NOT NULL,

    CONSTRAINT "AuthorizationCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OAuthSession" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "clientId" TEXT,
    "redirectUri" TEXT,
    "codeChallenge" TEXT,
    "codeChallengeMethod" TEXT,
    "oauthState" TEXT,
    "scope" TEXT,
    "resource" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OAuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserProfile" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerUserId" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "raw" JSONB,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Token" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "type" "public"."TokenType" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "familyId" TEXT,
    "generation" INTEGER,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userProfileId" TEXT NOT NULL,

    CONSTRAINT "Token_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "OAuthClient_clientId_key" ON "public"."OAuthClient"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "AuthorizationCode_code_key" ON "public"."AuthorizationCode"("code");

-- CreateIndex
CREATE UNIQUE INDEX "OAuthSession_sessionId_key" ON "public"."OAuthSession"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_provider_providerUserId_key" ON "public"."UserProfile"("provider", "providerUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Token_token_key" ON "public"."Token"("token");

-- CreateIndex
CREATE INDEX "Token_familyId_idx" ON "public"."Token"("familyId");

-- CreateIndex
CREATE INDEX "Token_expiresAt_idx" ON "public"."Token"("expiresAt");

-- CreateIndex
CREATE INDEX "Token_userProfileId_idx" ON "public"."Token"("userProfileId");

-- AddForeignKey
ALTER TABLE "public"."AuthorizationCode" ADD CONSTRAINT "AuthorizationCode_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "public"."UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Token" ADD CONSTRAINT "Token_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "public"."UserProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
