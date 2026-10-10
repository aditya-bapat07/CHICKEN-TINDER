DROP TABLE "ChatMessage";

CREATE TABLE "ChatConversation" (
  "id" TEXT NOT NULL,
  "userOneId" TEXT NOT NULL,
  "userTwoId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChatConversation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ChatConversation_userOneId_userTwoId_key" ON "ChatConversation"("userOneId", "userTwoId");
CREATE INDEX "ChatConversation_userOneId_updatedAt_idx" ON "ChatConversation"("userOneId", "updatedAt");
CREATE INDEX "ChatConversation_userTwoId_updatedAt_idx" ON "ChatConversation"("userTwoId", "updatedAt");
ALTER TABLE "ChatConversation" ADD CONSTRAINT "ChatConversation_userOneId_fkey" FOREIGN KEY ("userOneId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ChatConversation" ADD CONSTRAINT "ChatConversation_userTwoId_fkey" FOREIGN KEY ("userTwoId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "DirectMessage" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "senderId" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DirectMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "DirectMessage_conversationId_createdAt_idx" ON "DirectMessage"("conversationId", "createdAt");
ALTER TABLE "DirectMessage" ADD CONSTRAINT "DirectMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ChatConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DirectMessage" ADD CONSTRAINT "DirectMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;