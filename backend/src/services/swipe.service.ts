import { RequestError } from "../lib/errors.js";
import { db } from "../lib/db.js";

const FORCE_THRESHOLD = 10;

export async function pickNextActivity(userId: string, sessionId: string) {
  const user = await db.user.findUnique({ where: { id: userId } });
  const profile = (user?.boredomProfile as any) || {
    energy: 3,
    budget: 3,
    social: 3,
  };

  // Swipes in this session or overall for the user
  const userSwipes = await db.swipe.findMany({
    where: { userId },
    select: { activityId: true },
  });
  const swipedIds = userSwipes.map((s) => s.activityId);

  const candidates = await db.activity.findMany({
    where: swipedIds.length > 0 ? { id: { notIn: swipedIds } } : {},
  });

  if (candidates.length === 0) {
    return null;
  }

  const scoredCandidates = candidates.map((c) => {
    const diffEnergy = Math.abs(c.energy - (profile.energy ?? 3));
    const diffBudget = Math.abs(c.budget - (profile.budget ?? 3));
    const diffSocial = Math.abs(c.social - (profile.social ?? 3));
    const score = 5 - (diffEnergy + diffBudget + diffSocial) / 3.0;
    return { ...c, score: Math.max(0.1, score) };
  });

  return weightedRandomPick(scoredCandidates, (c) => Math.pow(c.score, 2));
}

function weightedRandomPick<T>(items: T[], getWeight: (item: T) => number): T {
  const weights = items.map(getWeight);
  const totalWeight = weights.reduce((sum, w) => sum + w, 0);
  let random = Math.random() * totalWeight;

  for (let i = 0; i < items.length; i++) {
    if (random < weights[i]) {
      return items[i];
    }
    random -= weights[i];
  }
  return items[items.length - 1];
}

export async function handleSwipe(
  userId: string,
  sessionId: string,
  activityId: string,
  direction: "like" | "reject",
) {
  return db.$transaction(async (tx) => {
    // Serialize writes for this user, including session creation/end, on PostgreSQL.
    await tx.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId} FOR UPDATE`;
    const session = await tx.swipeSession.findUnique({
      where: { id: sessionId },
    });
    if (!session || session.userId !== userId || session.endedAt) {
      throw new RequestError("Session not found or invalid");
    }

    const activity = await tx.activity.findUnique({
      where: { id: activityId },
    });
    if (!activity) throw new RequestError("Activity not found");
    const duplicate = await tx.swipe.findUnique({
      where: { userId_activityId: { userId, activityId } },
    });
    if (duplicate)
      throw new RequestError("You already swiped on this activity");

    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });
    const streak = user.streakRejects;

    let finalDirection: "like" | "reject" | "forced_accept" = direction;
    let forced = false;

    if (direction === "reject" && streak + 1 >= FORCE_THRESHOLD) {
      finalDirection = "forced_accept";
      forced = true;
      await tx.swipeSession.update({
        where: { id: sessionId },
        data: {
          forcedAt: (await tx.swipe.count({ where: { sessionId } })) + 1,
        },
      });
    }

    const swipe = await tx.swipe.create({
      data: { userId, sessionId, activityId, direction: finalDirection },
    });

    if (finalDirection !== "reject") {
      await tx.match.create({
        data: { userId, activityId, status: "pending" },
      });
      await tx.user.update({
        where: { id: userId },
        data: { streakRejects: 0 },
      });
    } else {
      await tx.user.update({
        where: { id: userId },
        data: { streakRejects: streak + 1 },
      });
    }

    return {
      accepted: finalDirection !== "reject",
      forced,
      streak: forced ? 0 : finalDirection === "reject" ? streak + 1 : 0,
      message: forced
        ? "🚨 You rejected 10 in a row. Fate has decided for you."
        : finalDirection === "like"
          ? "Nice pick."
          : pickSassyRejectMessage(streak + 1),
    };
  });
}

function pickSassyRejectMessage(streak: number): string {
  const messages = [
    "Pickier than my cat.",
    `Rejected ${streak} in a row. Bold.`,
    "You sure you're bored, or just comfortable?",
    "The couch thanks you for your service.",
    `${10 - streak} more and the universe chooses for you...`,
  ];
  return messages[Math.floor(Math.random() * messages.length)];
}
