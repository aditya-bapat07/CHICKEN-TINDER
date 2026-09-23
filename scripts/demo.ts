import { buildApp } from "../backend/src/server.js";

async function runDemo() {
  process.env.NODE_ENV = "test"; // prevent server listen collision
  const app = await buildApp();

  console.log(
    "\n=============================================================",
  );
  console.log("🐔 CHICKEN TINDER API — LIVE INTERACTIVE DEMONSTRATION");
  console.log(
    "=============================================================\n",
  );

  // STEP 1: Registration
  console.log("📌 STEP 1: User Registration");
  console.log("Making request to: POST /auth/register");
  const regRes = await app.inject({
    method: "POST",
    url: "/auth/register",
    payload: {
      email: "alex.bored@chickentinder.io",
      name: "Alex The Picky Swiper",
    },
  });
  const regData = JSON.parse(regRes.payload);
  const apiKey = regData.apiKey;
  console.log("Response:");
  console.log(JSON.stringify(regData, null, 2));
  console.log(
    "\n-------------------------------------------------------------\n",
  );

  // STEP 2: Profile Quiz
  console.log("📌 STEP 2: Setting Boredom Profile via Quiz");
  console.log("Making request to: POST /me/profile/answers");
  const answersRes = await app.inject({
    method: "POST",
    url: "/me/profile/answers",
    headers: { "x-api-key": apiKey },
    payload: {
      answers: [
        { questionId: "energy_level", value: 2 }, // Low energy (Chill vibes)
        { questionId: "budget_flexibility", value: 1 }, // Cheap/Free ($0)
        { questionId: "social_setting", value: 1 }, // Solo
      ],
    },
  });
  console.log("Response:");
  console.log(JSON.stringify(JSON.parse(answersRes.payload), null, 2));
  console.log(
    "\n-------------------------------------------------------------\n",
  );

  // STEP 3: Start Session
  console.log("📌 STEP 3: Starting a Swipe Session");
  console.log("Making request to: POST /sessions");
  const sessionRes = await app.inject({
    method: "POST",
    url: "/sessions",
    headers: { "x-api-key": apiKey },
  });
  const sessionData = JSON.parse(sessionRes.payload);
  const sessionId = sessionData.sessionId;
  console.log("Response:");
  console.log(JSON.stringify(sessionData, null, 2));
  console.log(
    "\n-------------------------------------------------------------\n",
  );

  // STEP 4: Swiping Loop & Forced Commitment
  console.log(
    "📌 STEP 4: The Core Swipe Loop & Forced Commitment Mechanism (10 Rejects)",
  );
  console.log(
    "We will reject 10 activities in a row to demonstrate the commitment device!\n",
  );

  for (let i = 1; i <= 10; i++) {
    // Get candidate
    const nextRes = await app.inject({
      method: "GET",
      url: `/sessions/${sessionId}/next`,
      headers: { "x-api-key": apiKey },
    });
    const candidate = JSON.parse(nextRes.payload).activity;

    // Swipe reject
    const swipeRes = await app.inject({
      method: "POST",
      url: `/sessions/${sessionId}/swipe`,
      headers: { "x-api-key": apiKey },
      payload: {
        activityId: candidate.id,
        direction: "reject",
      },
    });
    const swipeResult = JSON.parse(swipeRes.payload);

    if (swipeResult.forced) {
      console.log(`❌ Swipe #${i}: REJECT -> "${candidate.title}"`);
      console.log(`🚨 FORCED ACCEPTANCE TRIGGERED AT SWIPE #${i}!`);
      console.log(`   Message: ${swipeResult.message}`);
      console.log(
        `   Accepted: ${swipeResult.accepted}, Forced: ${swipeResult.forced}`,
      );
    } else {
      console.log(`❌ Swipe #${i}: REJECT -> "${candidate.title}"`);
      console.log(
        `   Streak: ${swipeResult.streak}/10 | Message: "${swipeResult.message}"`,
      );
    }
    console.log("");
  }

  console.log(
    "-------------------------------------------------------------\n",
  );

  // STEP 5: Check Matches
  console.log("📌 STEP 5: Viewing Forced Match in Matches List");
  console.log("Making request to: GET /matches?status=pending");
  const matchesRes = await app.inject({
    method: "GET",
    url: "/matches?status=pending",
    headers: { "x-api-key": apiKey },
  });
  const matches = JSON.parse(matchesRes.payload);
  const forcedMatch = matches[0];
  console.log("Response:");
  console.log(JSON.stringify(matches, null, 2));
  console.log(
    "\n-------------------------------------------------------------\n",
  );

  // STEP 6: Share Match with Friends
  console.log("📌 STEP 6: Generating Public Share Token for Friends");
  console.log(`Making request to: POST /matches/${forcedMatch.id}/share`);
  const shareRes = await app.inject({
    method: "POST",
    url: `/matches/${forcedMatch.id}/share`,
    headers: { "x-api-key": apiKey },
  });
  const shareData = JSON.parse(shareRes.payload);
  console.log("Share Response:");
  console.log(JSON.stringify(shareData, null, 2));

  console.log(
    "\nFetching Public Shared View (No API Key Required): GET /shared/" +
      shareData.shareToken,
  );
  const publicRes = await app.inject({
    method: "GET",
    url: `/shared/${shareData.shareToken}`,
  });
  console.log("Public Response:");
  console.log(JSON.stringify(JSON.parse(publicRes.payload), null, 2));
  console.log(
    "\n-------------------------------------------------------------\n",
  );

  // STEP 7: Session Summary Recap & Leaderboard
  console.log("📌 STEP 7: Post-Session Summary Recap & Global Leaderboard");
  const summaryRes = await app.inject({
    method: "GET",
    url: `/sessions/${sessionId}/summary`,
    headers: { "x-api-key": apiKey },
  });
  console.log("Session Summary:");
  console.log(JSON.stringify(JSON.parse(summaryRes.payload), null, 2));

  const lbRes = await app.inject({
    method: "GET",
    url: "/leaderboard",
  });
  console.log("\nGlobal Leaderboard (Most Forced Matches):");
  console.log(JSON.stringify(JSON.parse(lbRes.payload), null, 2));

  console.log(
    "\n=============================================================",
  );
  console.log("✨ CHICKEN TINDER API DEMO COMPLETED SUCCESSFULLY!");
  console.log(
    "=============================================================\n",
  );

  await app.close();
}

runDemo();
