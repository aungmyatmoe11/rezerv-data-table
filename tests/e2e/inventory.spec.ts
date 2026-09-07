import { expect, test, type Page } from "@playwright/test";

const table = (page: Page) => page.getByRole("table", { name: "Inventory items" });
const rows = (page: Page) => table(page).locator("tbody tr.dt__tr:not(.dt__skeleton-row)");

test.describe("inventory — a differently shaped dataset on the same component", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/inventory");
    await expect(rows(page).first()).toBeVisible({ timeout: 15_000 });
  });

  test("server-side multi-sort: header clicks emit an ordered sorter list and the server orders the page", async ({ page }) => {
    const [first] = await Promise.all([page.waitForRequest((req) => req.url().includes("/api/items?") && req.url().includes("sort")), page.getByRole("columnheader", { name: /^Qty/ }).getByRole("button").click()]);
    expect(first.url()).toMatch(/quantity/);
    await expect(page.getByRole("columnheader", { name: /^Qty/ })).toHaveAttribute("aria-sort", "ascending");
    const [second] = await Promise.all([page.waitForRequest((req) => req.url().includes("/api/items?") && req.url().includes("unitPrice")), page.getByRole("columnheader", { name: /^Unit price/ }).getByRole("button").click()]);
    expect(second.url()).toMatch(/quantity/);
    expect(second.url()).toMatch(/unitPrice/);
    // priority badges appear only once more than one sorter is active
    await expect(table(page).locator(".dt__sort-priority")).toHaveCount(2);
  });

  test("tree rows: a product with variants expands into indented child rows", async ({ page }) => {
    // pin the row by index: once expanded its toggle relabels to "Collapse row" and a filter would move on
    const index = await rows(page).evaluateAll((trs) => trs.findIndex((tr) => tr.querySelector("button.dt__expand") !== null));
    expect(index).toBeGreaterThanOrEqual(0);
    const parent = rows(page).nth(index);
    const toggle = parent.getByRole("button", { name: /expand row|collapse row/i });
    const before = await rows(page).count();
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect.poll(() => rows(page).count()).toBeGreaterThan(before);
    await expect(table(page).locator('tbody tr.dt__tr[data-depth="1"]').first()).toBeVisible();
  });

  test("the Actions column stays pinned to the right while the body scrolls horizontally", async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 800 });
    const scroller = page.locator(".dt__scroller").first();
    await expect(scroller).toHaveAttribute("data-ping-right", "true");
    const pinned = table(page).locator('thead th[data-fixed="right"]');
    await expect(pinned.first()).toBeVisible();
    await scroller.evaluate((el) => {
      el.scrollLeft = el.scrollWidth;
    });
    await expect(scroller).toHaveAttribute("data-ping-right", "false");
    await expect(scroller).toHaveAttribute("data-ping-left", "true");
  });

  test("on-demand movements drawer opens from a row action", async ({ page }) => {
    await rows(page).first().getByRole("button", { name: /Movements/ }).click();
    const drawer = page.getByRole("dialog");
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole("table", { name: "Stock movements" }).locator("tbody tr.dt__tr").first()).toBeVisible({ timeout: 15_000 });
  });
});
