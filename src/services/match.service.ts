import crypto from "node:crypto";
import { db } from "../lib/db.js";

export async function getUserMatches(userId: string, status?: string) {
  return db.match.findMany({
    where: {
      userId,
      ...(status ? { status } : {}),
    },
    include: { activity: true },
    orderBy: { createdAt: "desc" },
  });
}

export async function getMatchById(matchId: string, userId?: string) {
  const match = await db.match.findUnique({
    where: { id: matchId },
    include: {
      activity: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });

  if (!match) return null;
  if (userId && match.userId !== userId) return null;

  return match;
}

export async function updateMatchStatus(
  matchId: string,
  userId: string,
  status: "done" | "skipped",
) {
  const match = await db.match.findUnique({ where: { id: matchId } });
  if (!match || match.userId !== userId) {
    throw new Error("Match not found or unauthorized");
  }

  return db.match.update({
    where: { id: matchId },
    data: {
      status,
      completedAt: status === "done" ? new Date() : null,
    },
    include: { activity: true },
  });
}

export async function createShareToken(matchId: string, userId: string) {
  const match = await db.match.findUnique({ where: { id: matchId } });
  if (!match || match.userId !== userId) {
    throw new Error("Match not found or unauthorized");
  }

  if (match.shareToken) {
    return {
      shareToken: match.shareToken,
      link: `/shared/${match.shareToken}`,
    };
  }

  const token = crypto.randomBytes(8).toString("hex");

  const updated = await db.match.update({
    where: { id: matchId },
    data: { shareToken: token },
  });

  return {
    shareToken: updated.shareToken,
    link: `/shared/${updated.shareToken}`,
  };
}

export async function getSharedMatch(shareToken: string) {
  return db.match.findUnique({
    where: { shareToken },
    include: {
      activity: true,
      user: { select: { name: true } },
    },
  });
}

export async function getLeaderboard() {
  const usersWithForcedMatches = await db.swipe.groupBy({
    by: ["userId"],
    where: {
      direction: "forced_accept",
    },
    _count: {
      id: true,
    },
    orderBy: {
      _count: {
        id: "desc",
      },
    },
    take: 10,
  });

  const userIds = usersWithForcedMatches.map((u) => u.userId);
  const users = await db.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true },
  });

  return usersWithForcedMatches.map((item) => {
    const user = users.find((u) => u.id === item.userId);
    return {
      userId: item.userId,
      userName: user?.name || "Anonymous",
      forcedMatchesCount: item._count.id,
    };
  });
}
