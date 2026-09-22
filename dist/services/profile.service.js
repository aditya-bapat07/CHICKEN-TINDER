"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QUIZ_QUESTIONS = void 0;
exports.computeBoredomProfile = computeBoredomProfile;
exports.QUIZ_QUESTIONS = [
    {
        id: "energy_level",
        question: "How are your physical energy levels right now?",
        dimension: "energy",
        options: [
            { label: "Exhausted / Couch potato mode", value: 1 },
            { label: "Low key / Chill vibes", value: 2 },
            { label: "Moderate / Normal day energy", value: 3 },
            { label: "High energy / Active", value: 4 },
            { label: "Ready to sprint a marathon!", value: 5 },
        ],
    },
    {
        id: "budget_flexibility",
        question: "What is your budget for today’s activity?",
        dimension: "budget",
        options: [
            { label: "Strictly $0 / Completely Free", value: 1 },
            { label: "Cheap ($5 - $15)", value: 2 },
            { label: "Moderate ($15 - $40)", value: 3 },
            { label: "Treating myself ($40 - $100)", value: 4 },
            { label: "Money is no object / Baller status", value: 5 },
        ],
    },
    {
        id: "social_setting",
        question: "Who do you want to be around?",
        dimension: "social",
        options: [
            { label: "100% Solo / Peaceful isolation", value: 1 },
            { label: "Me + 1 close friend / partner", value: 2 },
            { label: "Small tight-knit group (3-4 people)", value: 3 },
            { label: "Party / Community gathering", value: 4 },
            { label: "Huge crowd / Festival energy", value: 5 },
        ],
    },
];
function computeBoredomProfile(answers) {
    let energySum = 0, energyCount = 0;
    let budgetSum = 0, budgetCount = 0;
    let socialSum = 0, socialCount = 0;
    for (const ans of answers) {
        const q = exports.QUIZ_QUESTIONS.find((item) => item.id === ans.questionId);
        if (!q)
            continue;
        if (q.dimension === "energy") {
            energySum += ans.value;
            energyCount++;
        }
        if (q.dimension === "budget") {
            budgetSum += ans.value;
            budgetCount++;
        }
        if (q.dimension === "social") {
            socialSum += ans.value;
            socialCount++;
        }
    }
    return {
        energy: energyCount ? Math.round((energySum / energyCount) * 10) / 10 : 3,
        budget: budgetCount ? Math.round((budgetSum / budgetCount) * 10) / 10 : 3,
        social: socialCount ? Math.round((socialSum / socialCount) * 10) / 10 : 3,
    };
}
