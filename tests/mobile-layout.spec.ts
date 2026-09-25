import { test, expect } from "@playwright/test";

const activities = [
  ["creative", "Cook a dish from a country you can’t point to on a map"],
  ["creative", "Paint a canvas using only household items instead of brushes"],
  ["outdoor", "Take a walk somewhere new"],
  ["fitness", "Stretch for ten minutes"],
  ["social", "Plan a picnic with friends"],
  ["solo", "Spend some time with your favorite book"],
  ["learning", "Learn something you have always wondered about"],
  ["gaming", "Play a quick game"],
].map(([category, title], i) => ({
  id: `layout-${i}`,
  category,
  title,
  description:
    "Try a fresh idea at your own pace and make a little room for something different today.",
  durationMin: 30,
  energy: 2,
  budget: 1,
  social: 2,
}));

test.beforeEach(async ({ page }) => {
  // Layout checks never create accounts or modify the live database.
  if (!process.env.LAYOUT_BASE_URL) {
    await page.route("**/api/activities", (route) =>
      route.fulfill({ json: activities }),
    );
  }
});

for (const width of [320, 390, 430, 768, 1440]) {
  test(`readable catalog and navigation at ${width}px`, async ({
    page,
  }, testInfo) => {
    const mobile = width <= 650;
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/activities");
    await expect(page.locator(".activity-card").first()).toBeVisible();
    await page.getByRole("button", { name: "Creative", exact: true }).click();
    const cards = page.locator(".activity-card");
    await expect(cards.nth(1)).toBeVisible();
    await cards.first().scrollIntoViewIfNeeded();
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(cards.first().locator(".art-symbol svg")).toBeVisible();
    const first = (await cards.first().boundingBox())!;
    const second = (await cards.nth(1).boundingBox())!;
    if (mobile) {
      expect(second.y).toBeGreaterThanOrEqual(first.y + first.height);
      expect(
        await cards
          .first()
          .locator("h3")
          .evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
      ).toBeGreaterThanOrEqual(15);
      const nav = page.getByRole("navigation", { name: "Main navigation" });
      const box = (await nav.boundingBox())!;
      expect(box.y).toBeGreaterThan(0);
      expect(box.y + box.height).toBeLessThanOrEqual(844);
      for (const link of await nav.getByRole("link").all()) {
        expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      }
    } else {
      expect(Math.abs(second.y - first.y)).toBeLessThan(2);
    }
    await page.screenshot({
      path: testInfo.outputPath(`catalog-${width}.png`),
    });
    await cards.first().click();
    const modal = page.getByRole("dialog");
    await expect(modal).toBeVisible();
    const modalBox = (await modal.boundingBox())!;
    expect(modalBox.x).toBeGreaterThanOrEqual(0);
    expect(modalBox.x + modalBox.width).toBeLessThanOrEqual(width);
    expect(modalBox.y).toBeGreaterThanOrEqual(0);
    await page.getByRole("button", { name: "Close dialog" }).click();
    await page.goto("/");
      await expect(page.locator(".activity-card")).toHaveCount(6);
      if (mobile) {
        // Artwork must stay below the copy and both calls to action on narrow phones.
        const copy = (await page.locator(".hero-copy").boundingBox())!;
        const art = (await page.locator(".hero-art").boundingBox())!;
        expect(art.y).toBeGreaterThanOrEqual(copy.y + copy.height);
        expect((await page.locator(".topbar").boundingBox())!.height).toBeLessThan(100);
      }
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: testInfo.outputPath(`discover-${width}.png`),
    });
    if (mobile) {
      await page.goto("/signin");
      const email = page.getByLabel("Email address");
      await expect(email).toBeVisible();
      expect(
        await email.evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
      ).toBeGreaterThanOrEqual(16);
      await email.fill("phone-layout@example.invalid");
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
    }
    expect(errors).toEqual([]);
  });
}
