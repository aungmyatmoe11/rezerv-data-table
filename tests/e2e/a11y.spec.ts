import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const path of ["/", "/timetable"]) {
  test(`${path} has no serious or critical accessibility violations`, async ({ page }) => {
    await page.goto(path);
    await expect(page.locator("main")).toBeVisible();
    await page.waitForTimeout(1200); // let the mocked fetch settle so real rows are audited
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
    expect(serious, JSON.stringify(serious.map((v) => ({ id: v.id, nodes: v.nodes.length })), null, 2)).toEqual([]);
  });
}

test("keyboard: sort buttons, expand toggles and pagination are reachable and operable", async ({ page }) => {
  await page.goto("/timetable");
  const sortButton = page.getByRole("columnheader", { name: /^Class/ }).getByRole("button");
  await sortButton.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("columnheader", { name: /^Class/ })).toHaveAttribute("aria-sort", "ascending");

  const expand = page.getByRole("table", { name: "Class timetable" }).locator("tbody tr.dt__tr:has(button.dt__expand)").first().getByRole("button", { name: /expand row|collapse row/i });
  await expand.focus();
  await page.keyboard.press("Space");
  await expect(expand).toHaveAttribute("aria-expanded", "true");
  await expect(expand).toHaveAttribute("aria-controls", /.+/);

  // the expanded row above added a nested table with its own pager, so target this table's
  const next = page.getByRole("navigation", { name: "Class timetable pagination" }).getByRole("button", { name: "Next page" });
  await next.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Page 2" })).toHaveAttribute("aria-current", "page");
});
