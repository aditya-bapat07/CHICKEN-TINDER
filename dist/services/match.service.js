"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserMatches = getUserMatches;
exports.getMatchById = getMatchById;
exports.updateMatchStatus = updateMatchStatus;
exports.createShareToken = createShareToken;
exports.getSharedMatch = getSharedMatch;
exports.getLeaderboard = getLeaderboard;
const node_crypto_1 = __importDefault(require("node:crypto"));
const db_js_1 = require("../lib/db.js");
async function getUserMatches(userId, status) {
    return db_js_1.db.match.findMany({
        where: {
            userId,
            ...(status ? { status } : {}),
        },
        include: { activity: true },
        orderBy: { createdAt: "desc" },
    });
}
async function getMatchById(matchId, userId) {
    const match = await db_js_1.db.match.findUnique({
        where: { id: matchId },
        include: {
            activity: true,
            user: { select: { id: true, name: true, email: true } },
        },
    });
    if (!match)
        return null;
    if (userId && match.userId !== userId)
        return null;
    return match;
}
async function updateMatchStatus(matchId, userId, status) {
    const match = await db_js_1.db.match.findUnique({ where: { id: matchId } });
    if (!match || match.userId !== userId) {
        throw new Error("Match not found or unauthorized");
    }
    return db_js_1.db.match.update({
        where: { id: matchId },
        data: {
            status,
            completedAt: status === "done" ? new Date() : null,
        },
        include: { activity: true },
    });
}
async function createShareToken(matchId, userId) {
    const match = await db_js_1.db.match.findUnique({ where: { id: matchId } });
    if (!match || match.userId !== userId) {
        throw new Error("Match not found or unauthorized");
    }
    if (match.shareToken) {
        return {
            shareToken: match.shareToken,
            link: `/shared/${match.shareToken}`,
        };
    }
    const token = node_crypto_1.default.randomBytes(8).toString("hex");
    const updated = await db_js_1.db.match.update({
        where: { id: matchId },
        data: { shareToken: token },
    });
    return {
        shareToken: updated.shareToken,
        link: `/shared/${updated.shareToken}`,
    };
}
async function getSharedMatch(shareToken) {
    return db_js_1.db.match.findUnique({
        where: { shareToken },
        include: {
            activity: true,
            user: { select: { name: true } },
        },
    });
}
async function getLeaderboard() {
    const usersWithForcedMatches = await db_js_1.db.swipe.groupBy({
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
    const users = await db_js_1.db.user.findMany({
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
