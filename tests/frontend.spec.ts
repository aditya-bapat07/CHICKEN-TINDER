import { test, expect } from "@playwright/test";

test("guest discovery filters, details and mobile layout", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Make today a little less ordinary." }),
  ).toBeVisible();
  await expect(page.locator(".activity-card")).toHaveCount(6);
  await page.screenshot({
    path: "test-results/discover-desktop.png",
    fullPage: true,
  });
  await page.getByLabel("Search activities").fill("nonexistent-silly-search");
  await expect(page.getByText("No ideas found just yet.")).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).click();
  await page.getByRole("button", { name: "Outdoors", exact: false }).click();
  await expect(page.locator(".activity-card").first()).toContainText("outdoor");
  await page.locator(".activity-card").first().click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".activity-card").first()).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/discover-mobile.png",
    fullPage: true,
  });
  expect(errors).toEqual([]);
});

test("complete account, quiz, swipe, matches, sharing and API key journey", async ({
  page,
  browser,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const email = `journey-${Date.now()}@example.com`;
  await page.goto("/signup");
  await page.getByLabel("Your name").fill("Jamie Explorer");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("my-adventure-123");
  await page.getByRole("button", { name: "Create my account" }).click();
  await expect(page).toHaveURL(/\/quiz$/);
  for (let i = 0; i < 3; i++) {
    await page.getByRole("radio").nth(1).click();
    await page
      .getByRole("button", {
        name: i === 2 ? "Find my next thing" : "Next question",
      })
      .click();
  }
  await expect(page).toHaveURL(/\/swipe$/);
  await page.getByRole("button", { name: "Start discovering" }).click();
  await expect(page.locator(".swipe-card")).toBeVisible();
  await page.getByRole("button", { name: "Yes, let’s do it" }).click();
  await expect(page.getByRole("dialog")).toContainText("That’s a match!");
  await page.getByRole("link", { name: "See my matches" }).click();
  await expect(page.locator(".match-card")).toHaveCount(1);
  // Reload a URL shared by the legacy API and frontend to check production routing.
  await page.reload();
  await expect(page.locator(".match-card")).toHaveCount(1);
  await page.getByRole("button", { name: /^Share / }).click();
  const inviteUrl = await page.getByLabel("Share link").inputValue();
  const guest = await browser.newPage();
  await guest.goto(inviteUrl);
  await expect(
    guest.getByRole("heading", { name: "Jamie Explorer has an idea." }),
  ).toBeVisible();
  await guest.close();
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.getByRole("button", { name: "Mark done" }).click();
  await page.getByRole("button", { name: /Completed/ }).click();
  await expect(page.locator(".match-card")).toHaveCount(1);
  await page.goto("/keys");
  await page.getByRole("button", { name: "Generate API key" }).click();
  await page.getByLabel("Key name").fill("My integration");
  await page.getByRole("button", { name: "Generate key", exact: true }).click();
  const key = await page.getByLabel("Generated API key").inputValue();
  expect(key).toMatch(/^ct_live_/);
  await page.getByRole("button", { name: "Copy", exact: true }).click();
  await expect(page.getByRole("button", { name: "Copied!" })).toBeVisible();
  await page.getByRole("button", { name: "I’ve saved my key" }).click();
  await expect(
    page.locator(".key-row").filter({ hasText: "My integration" }),
  ).toContainText("Active");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/signin$/);
  await page.getByRole("button", { name: "API key", exact: true }).click();
  await page.getByLabel("API key", { exact: true }).fill(key);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/keys$/);
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill("my-adventure-123");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/keys$/);
  await page
    .locator(".key-row")
    .filter({ hasText: "My integration" })
    .getByRole("button", { name: "Revoke", exact: true })
    .click();
  await page.getByRole("button", { name: "Revoke key", exact: true }).click();
  await expect(
    page.locator(".key-row").filter({ hasText: "My integration" }),
  ).toContainText("Revoked");
  await page.goto("/settings");
  await page.getByLabel("Your name").fill("Jamie Updated");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByRole("status")).toContainText("Your profile is saved");
  await page.getByLabel("Current password").fill("my-adventure-123");
  await page
    .getByLabel("New password", { exact: true })
    .fill("updated-adventure-456");
  await page.getByLabel("Confirm new password").fill("updated-adventure-456");
  await page.getByRole("button", { name: "Save password" }).click();
  await expect(page.getByRole("status")).toContainText(
    "Your password is saved",
  );
  await page.goto("/swipe");
  await page.getByRole("button", { name: "Resume session" }).click();
  for (let i = 0; i < 10; i++) {
    await page
      .getByRole("button", {
        name: i === 9 ? "Let fate choose" : "Not this time",
      })
      .click();
    if (i < 9)
      await expect(page.getByText(`${i + 1} of 10 passes`)).toBeVisible();
  }
  await expect(page.getByRole("dialog")).toContainText(
    "A little nudge from fate.",
  );
  await page.getByRole("button", { name: "Keep discovering" }).click();
  await page.getByRole("button", { name: "End session" }).click();
  await expect(
    page.getByRole("heading", { name: "A little less bored already." }),
  ).toBeVisible();
  await page.goto("/matches");
  await page.getByRole("button", { name: "Skip", exact: true }).click();
  await page.getByRole("button", { name: /Skipped/ }).click();
  await expect(page.locator(".match-card")).toHaveCount(1);
  await page.goto("/activities");
  await page.getByRole("button", { name: "Add an activity" }).click();
  await page.getByLabel("Activity title").fill("Sketch a tiny adventure map");
  await page
    .getByLabel("What’s the plan?")
    .fill("Draw a map of a favorite neighborhood.");
  await page.getByRole("button", { name: "Add activity", exact: true }).click();
  await page
    .getByLabel("Search activities")
    .fill("Sketch a tiny adventure map");
  await expect(page.locator(".activity-card")).toHaveCount(1);
  expect(errors).toEqual([]);
});

test("errors are actionable and protected routes retain destination", async ({
  page,
}) => {
  await page.goto("/keys");
  await expect(page).toHaveURL(/\/signin$/);
  await page.getByLabel("Email address").fill("unknown@example.com");
  await page.getByLabel("Password", { exact: true }).fill("not-a-password");
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Email or password is incorrect",
  );
  await page.goto("/");
  await page.route("**/api/activities", (route) => route.abort());
  await page.reload();
  await expect(page.getByRole("alert")).toContainText("Unable to connect");
  await page.unroute("**/api/activities");
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.locator(".activity-card")).toHaveCount(6);
});

test("scroll reveals, progress, surprise filters and motion preference work", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-motion", "on");
  await expect(page.locator(".activity-card")).toHaveCount(6);
  await page.getByRole("button", { name: "Explore the ideas below" }).click();
  await expect(page.getByLabel("Search activities")).toBeFocused();
  await page.getByLabel("Maximum activity duration").selectOption("30");
  await page.getByLabel("Free activities only").check();
  await expect(page.locator(".activity-card").first()).toBeVisible();
  await page.getByRole("button", { name: "Surprise me" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("Free to try");
  const minutes = await dialog
    .locator(".detail-chips span")
    .first()
    .innerText();
  expect(parseInt(minutes)).toBeLessThanOrEqual(30);
  await page.getByRole("button", { name: "Close dialog" }).click();
  await page.locator(".scroll-story").scrollIntoViewIfNeeded();
  await expect(page.locator(".scroll-story")).toHaveClass(/is-visible/);
  await expect(page.locator(".scroll-story")).toHaveCSS("opacity", "1");
  await expect(page.getByRole("button", { name: "Back to top" })).toBeVisible();
  await expect
    .poll(() =>
      page
        .locator(".scroll-progress>div")
        .evaluate((el) => getComputedStyle(el).transform),
    )
    .not.toBe("matrix(0, 0, 0, 1, 0, 0)");
  await page.screenshot({ path: "test-results/scroll-effects-desktop.png" });
  await page.getByRole("button", { name: "Back to top" }).click();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.getByRole("button", { name: "Pause animations" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "off");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Pause animations" }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".activity-card").first()).toHaveCSS(
    "opacity",
    "1",
  );
  await page.getByRole("button", { name: "Pause animations" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "on");
});

test("system reduced motion and narrow-screen controls stay accessible", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(
    page.getByRole("button", {
      name: "Animations disabled by system preference",
    }),
  ).toBeDisabled();
  await expect(page.locator("html")).toHaveAttribute("data-motion", "off");
  await expect(page.locator(".activity-card")).toHaveCount(6);
  await expect(page.locator(".activity-card").last()).toHaveCSS("opacity", "1");
  await page.getByRole("button", { name: "Explore the ideas below" }).click();
  await expect(
    page.getByRole("button", { name: "Surprise me" }),
  ).toBeInViewport();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/scroll-effects-mobile.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Back to top" }).click();
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(page.locator("html")).toHaveAttribute("data-motion", "on");
});
