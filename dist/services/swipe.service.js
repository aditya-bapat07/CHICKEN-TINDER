"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pickNextActivity = pickNextActivity;
exports.handleSwipe = handleSwipe;
const db_js_1 = require("../lib/db.js");
const FORCE_THRESHOLD = 10;
async function pickNextActivity(userId, sessionId) {
    const user = await db_js_1.db.user.findUnique({ where: { id: userId } });
    const profile = user?.boredomProfile || {
        energy: 3,
        budget: 3,
        social: 3,
    };
    // Swipes in this session or overall for the user
    const userSwipes = await db_js_1.db.swipe.findMany({
        where: { userId },
        select: { activityId: true },
    });
    const swipedIds = userSwipes.map((s) => s.activityId);
    const candidates = await db_js_1.db.activity.findMany({
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
function weightedRandomPick(items, getWeight) {
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
async function handleSwipe(userId, sessionId, activityId, direction) {
    return db_js_1.db.$transaction(async (tx) => {
        const session = await tx.swipeSession.findUnique({
            where: { id: sessionId },
        });
        if (!session || session.userId !== userId || session.endedAt) {
            throw new Error("Session not found or invalid");
        }
        const activity = await tx.activity.findUnique({
            where: { id: activityId },
        });
        if (!activity)
            throw new Error("Activity not found");
        const duplicate = await tx.swipe.findUnique({
            where: { userId_activityId: { userId, activityId } },
        });
        if (duplicate)
            throw new Error("You already swiped on this activity");
        const recentSwipes = await tx.swipe.findMany({
            where: { sessionId },
            orderBy: { createdAt: "asc" },
        });
        // Count consecutive rejects from the end
        let streak = 0;
        for (let i = recentSwipes.length - 1; i >= 0; i--) {
            if (recentSwipes[i].direction === "reject")
                streak++;
            else
                break;
        }
        let finalDirection = direction;
        let forced = false;
        if (direction === "reject" && streak + 1 >= FORCE_THRESHOLD) {
            finalDirection = "forced_accept";
            forced = true;
            await tx.swipeSession.update({
                where: { id: sessionId },
                data: { forcedAt: recentSwipes.length + 1 },
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
        }
        else {
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
function pickSassyRejectMessage(streak) {
    const messages = [
        "Pickier than my cat.",
        `Rejected ${streak} in a row. Bold.`,
        "You sure you're bored, or just comfortable?",
        "The couch thanks you for your service.",
        `${10 - streak} more and the universe chooses for you...`,
    ];
    return messages[Math.floor(Math.random() * messages.length)];
}
