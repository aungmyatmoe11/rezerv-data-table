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
    await page.goto("/playground?bordered=true&selection=checkbox&expansion=inline&scrollY=fixed&columnReorder=true");
    const table = liveTable(page);
    await expect(table).toHaveAttribute("data-bordered", "true");
    await expect(table).toHaveAttribute("data-sticky-header", "true");
    await expect(table.getByRole("checkbox", { name: "Select all rows on this page" })).toBeVisible();
    await expect(table.getByRole("button", { name: "Expand row" }).first()).toBeVisible();
    await expect(table.getByRole("button", { name: /^Reorder column/ }).first()).toBeVisible();
    const code = await generated(page).innerText();
    for (const fragment of ["bordered", "rowSelection", "expandable", "y: 420", "columnReorder"]) expect(code).toContain(fragment);
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

  test("columnReorder: dragging a header handle reorders columns and emits onReorder", async ({ page }) => {
    await page.goto("/playground?columnReorder=true");
    const table = liveTable(page);
    const headers = table.locator("thead th");
    const before = await headers.allInnerTexts();
    const instructorHandle = table.getByRole("button", { name: "Reorder column Instructor" });
    // the header's accessible name starts with its drag handle, so match the title anywhere
    const timeHeader = table.getByRole("columnheader", { name: /\bTime\b/ });
    const from = await instructorHandle.boundingBox();
    const to = await timeHeader.boundingBox();
    if (from === null || to === null) throw new Error("header cells not laid out");
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(from.x + 20, from.y + from.height / 2, { steps: 4 });
    await page.mouse.move(to.x + to.width * 0.8, to.y + to.height / 2, { steps: 12 });
    await page.mouse.up();
    await expect.poll(() => headers.allInnerTexts()).not.toEqual(before);
    await expect(page.locator(".pg-event-list li").first()).toContainText("columnReorder.onReorder");
  });

  test("keyboard reorder: Space, ArrowRight, Space moves a column", async ({ page }) => {
    await page.goto("/playground?columnReorder=true");
    const table = liveTable(page);
    const headers = table.locator("thead th");
    const before = await headers.allInnerTexts();
    // dnd-kit's screen-reader live region is the reliable signal that each phase has committed
    const live = page.locator('[id^="DndLiveRegion"]');
    await table.getByRole("button", { name: "Reorder column Instructor" }).focus();
    await page.keyboard.press("Space");
    // "picked up" is replaced within a frame by the first "moved over <itself>" once droppables are measured
    await expect(live).toContainText(/instructor was moved over droppable area instructor/);
    // inside a horizontally scrollable table dnd-kit may spend the first arrow press scrolling the
    // container (its keep-in-view heuristic); a user simply presses again, so the test does too
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await page.keyboard.press("ArrowRight");
      const moved = await expect(live)
        .toContainText(/instructor was moved over droppable area location/, { timeout: 700 })
        .then(() => true, () => false);
      if (moved) break;
    }
    await expect(live).toContainText(/instructor was moved over droppable area location/);
    await page.keyboard.press("Space");
    await expect(live).toContainText(/instructor was dropped over droppable area location/);
    await expect.poll(() => headers.allInnerTexts()).not.toEqual(before);
    await expect(page.locator(".pg-event-list li").first()).toContainText("columnReorder.onReorder");
  });

  test("toggling a switch updates the table and the JSX together", async ({ page }) => {
    await page.goto("/playground");
    await toggle(page, "bordered");
    await expect(liveTable(page)).toHaveAttribute("data-bordered", "true");
    await expect(generated(page)).toContainText("bordered");
    await expect(page).toHaveURL(/bordered=true/);
  });
});
