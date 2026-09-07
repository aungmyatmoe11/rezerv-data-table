import { expect, test, type Page } from "@playwright/test";

const stage = (page: Page) => page.getByRole("region", { name: "Live table" });
const liveTable = (page: Page) => stage(page).locator(".dt").first();
const generated = (page: Page) => page.locator('pre[aria-label="Generated JSX"]');

async function toggle(page: Page, label: string): Promise<void> {
  await page.locator(".pg-field", { hasText: new RegExp(`^${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`) }).getByRole("switch").click();
}

test.describe("playground — the generated JSX matches the rendered table", () => {
  test("defaults render a bare table and an equally bare snippet", async ({ page }) => {
    await page.goto("/playground");
    await expect(liveTable(page).locator("thead")).toBeVisible();
    const code = await generated(page).innerText();
    expect(code).toContain("<DataTable<ClassSession>");
    expect(code).not.toContain("rowSelection");
    expect(code).not.toContain("expandable");
    expect(code).not.toContain("virtual");
    await expect(liveTable(page).locator(".dt__selection-cell")).toHaveCount(0);
  });

  test("URL state drives config: every attribute in the query shows up in the JSX and the DOM", async ({ page }) => {
    await page.goto("/playground?bordered=true&selection=checkbox&expansion=inline&scrollY=fixed");
    const table = liveTable(page);
    await expect(table).toHaveAttribute("data-bordered", "true");
    await expect(table).toHaveAttribute("data-sticky-header", "true");
    await expect(table.getByRole("checkbox", { name: "Select all rows on this page" })).toBeVisible();
    await expect(table.getByRole("button", { name: "Expand row" }).first()).toBeVisible();
    const code = await generated(page).innerText();
    for (const fragment of ["bordered", "rowSelection", "expandable", "y: 420"]) expect(code).toContain(fragment);
  });

  test("callbacks land in the event log with the antd-shaped payload", async ({ page }) => {
    await page.goto("/playground");
    await liveTable(page).getByRole("columnheader", { name: /^Class/ }).getByRole("button").click();
    const events = page.locator(".pg-event-list li");
    await expect(events.first()).toContainText("onChange");
    await expect(events.first()).toContainText('"action": "sort"');
    await page.getByRole("button", { name: "Clear" }).click();
    await expect(events).toHaveCount(0);
  });

  test("virtual: 10,000 rows render a window, and scrolling moves the window", async ({ page }) => {
    await page.goto("/playground?rowHeight=44&rows=10000&pagination=false&scrollY=fixed&virtual=true");
    const table = liveTable(page);
    await expect(table).toHaveAttribute("data-virtual", "true");
    await expect(table.locator("table")).toHaveAttribute("aria-rowcount", "10001");
    const rows = table.locator("tbody tr.dt__tr");
    await expect(rows.first()).toBeVisible();
    const mounted = await rows.count();
    expect(mounted).toBeLessThan(40);
    await table.locator(".dt__scroller").evaluate((el) => {
      el.scrollTop = 220_000;
    });
    await expect(rows.first()).toHaveAttribute("aria-rowindex", /^4\d{3}$/);
    expect(await rows.count()).toBeLessThan(40);
  });

  test("scroll.y: 'auto' sizes the body to its container", async ({ page }) => {
    await page.goto("/playground?rows=200&scrollY=auto");
    const scroller = liveTable(page).locator(".dt__scroller");
    await expect
      .poll(async () => scroller.evaluate((el) => Math.round(el.getBoundingClientRect().height)))
      .toBeGreaterThan(200);
    const height = await scroller.evaluate((el) => el.getBoundingClientRect().height);
    expect(height).toBeLessThan(520);
    await expect(scroller).toHaveCSS("overflow-y", "auto");
  });

  test("toggling a switch updates the table and the JSX together", async ({ page }) => {
    await page.goto("/playground");
    await toggle(page, "bordered");
    await expect(liveTable(page)).toHaveAttribute("data-bordered", "true");
    await expect(generated(page)).toContainText("bordered");
    await expect(page).toHaveURL(/bordered=true/);
  });
});
