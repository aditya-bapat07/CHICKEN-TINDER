ALTER TABLE "User" ADD COLUMN "username" TEXT;

UPDATE "User"
SET "username" = COALESCE(
  NULLIF(regexp_replace(lower("name"), '[^a-z0-9]+', '_', 'g'), ''),
  'member'
) || '_' || substr("id", 1, 6);

ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

CREATE TABLE "ChatMessage" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ChatMessage_createdAt_idx" ON "ChatMessage"("createdAt");
ALTER TABLE "ChatMessage"
  ADD CONSTRAINT "ChatMessage_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;