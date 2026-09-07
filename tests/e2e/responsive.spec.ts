import { expect, test } from "@playwright/test";

// Runs under the "mobile" project (Pixel 7 emulation).
test("mobile: the timetable scrolls horizontally and keeps the Class column pinned", async ({ page }) => {
  await page.goto("/timetable");
  const table = page.getByRole("table", { name: "Class timetable" });
  await expect(table.locator("tbody tr.dt__tr:not(.dt__skeleton-row)").first()).toBeVisible({ timeout: 15_000 });

  const scroller = page.locator(".dt__scroller").first();
  const overflow = await scroller.evaluate((el) => el.scrollWidth > el.clientWidth);
  expect(overflow).toBe(true);

  const pinned = table.locator('tbody tr.dt__tr td[data-fixed="left"]').first();
  const before = await pinned.boundingBox();
  await scroller.evaluate((el) => {
    el.scrollLeft = 300;
  });
  await expect(scroller).toHaveAttribute("data-ping-left", "true");
  const after = await pinned.boundingBox();
  expect(Math.abs((after?.x ?? 0) - (before?.x ?? 0))).toBeLessThan(2);

  // the page itself never scrolls sideways
  const bodyOverflow = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  expect(bodyOverflow).toBe(true);
});
