import { expect, test, type Page } from "@playwright/test";

const table = (page: Page) => page.getByRole("table", { name: "Class timetable" });
const firstDataRow = (page: Page) => table(page).locator("tbody tr.dt__tr").first();
/** The toggle re-labels itself Expand ↔ Collapse, so match both and scope to the first expandable row. */
const firstExpandToggle = (page: Page) => table(page).locator("tbody tr.dt__tr:has(button.dt__expand)").first().getByRole("button", { name: /expand row|collapse row/i });

/** Our Segmented renders real radios, and Select a real listbox — both addressable by role. */
async function pickSegment(page: Page, label: string): Promise<void> {
  await page.getByRole("radio", { name: label, exact: true }).first().click();
}

async function chooseScenario(page: Page, label: string): Promise<void> {
  await page.getByRole("combobox").first().click();
  await page.getByRole("option", { name: label, exact: true }).click();
}

async function waitForRows(page: Page): Promise<void> {
  await expect(table(page).locator("tbody tr.dt__tr:not(.dt__skeleton-row)").first()).toBeVisible({ timeout: 15_000 });
}

test.describe("timetable — client mode", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/timetable");
    await waitForRows(page);
  });

  test("shows skeleton rows while loading, then real rows", async ({ page }) => {
    await chooseScenario(page, "Slow network");
    await expect(page.locator(".dt__skeleton-row").first()).toBeVisible();
    await waitForRows(page);
    await expect(page.locator(".dt__skeleton-row")).toHaveCount(0);
  });

  test("ellipsis cells expose their full text on hover", async ({ page }) => {
    const cell = table(page).locator('tbody td.dt__td[data-ellipsis="true"]').first();
    const title = await cell.getAttribute("title");
    expect(title).not.toBeNull();
    // the Class column renders custom markup, so the title falls back to the underlying value
    expect(await cell.innerText()).toContain(title ?? "");
  });

  test("sorts a column ascending → descending → none", async ({ page }) => {
    const header = page.getByRole("columnheader", { name: /^Class/ });
    const button = header.getByRole("button");
    await expect(header).toHaveAttribute("aria-sort", "none");
    await button.click();
    await expect(header).toHaveAttribute("aria-sort", "ascending");
    const ascFirst = await firstDataRow(page).locator("td").nth(2).innerText();
    await button.click();
    await expect(header).toHaveAttribute("aria-sort", "descending");
    const descFirst = await firstDataRow(page).locator("td").nth(2).innerText();
    expect(ascFirst.localeCompare(descFirst)).toBeLessThanOrEqual(0);
    await button.click();
    await expect(header).toHaveAttribute("aria-sort", "none");
  });

  test("paginates with page size + navigation over the full dataset", async ({ page }) => {
    await expect(page.getByText(/1–10 of 64/)).toBeVisible();
    await page.getByRole("button", { name: "Page 2" }).click();
    await expect(page.getByRole("button", { name: "Page 2" })).toHaveAttribute("aria-current", "page");
    await expect(page.getByText(/11–20 of 64/)).toBeVisible();
    await page.getByRole("button", { name: "Next page" }).click();
    await expect(page.getByText(/21–30 of 64/)).toBeVisible();
  });

  test("expands a class inline to reveal its attendees below the row", async ({ page }) => {
    const toggle = firstExpandToggle(page);
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    const region = page.getByRole("region").first();
    await expect(region).toBeVisible();
    const nested = region.getByRole("table", { name: /^Attendees for/ });
    await expect(nested).toBeVisible();
    await expect(nested.getByRole("columnheader", { name: /Customer/ })).toBeVisible();
    // the nested table is the same component with real children, not an empty shell
    const nestedRows = nested.locator("tbody tr.dt__tr:not(.dt__state-row)");
    expect(await nestedRows.count()).toBeGreaterThan(0);
    // and it renders at the parent's density — root-level rules must not leak across tables
    const parentCell = table(page).locator("> tbody > tr.dt__tr > td.dt__td").nth(2);
    const nestedCell = nested.locator("tbody tr.dt__tr td.dt__td").first();
    expect(await nestedCell.evaluate((el) => getComputedStyle(el).padding)).toBe(await parentCell.evaluate((el) => getComputedStyle(el).padding));
    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByRole("region")).toHaveCount(0);
  });

  test("on-demand children: loading state, error with Retry, then content", async ({ page }) => {
    await pickSegment(page, "On-demand");
    await chooseScenario(page, "Fail once, then succeed");
    // the list request fails once too — recover it first, then exercise the child fetch
    const listAlert = page.getByRole("alert");
    await expect(listAlert).toBeVisible({ timeout: 15_000 });
    await listAlert.getByRole("button", { name: "Retry" }).click();
    await waitForRows(page);
    await firstExpandToggle(page).click();
    const region = page.getByRole("region").first();
    await expect(region).toHaveAttribute("aria-busy", "true");
    await expect(region.getByRole("alert")).toBeVisible({ timeout: 15_000 });
    await region.getByRole("button", { name: "Retry" }).click();
    await expect(region.getByRole("columnheader", { name: /Customer/ })).toBeVisible({ timeout: 15_000 });
  });

  test("empty and error states, with a working retry", async ({ page }) => {
    await chooseScenario(page, "Empty dataset");
    await expect(page.getByText("No classes scheduled this week.")).toBeVisible({ timeout: 15_000 });
    await chooseScenario(page, "Fail once, then succeed");
    const alert = page.getByRole("alert");
    await expect(alert).toBeVisible({ timeout: 15_000 });
    await alert.getByRole("button", { name: "Retry" }).click();
    await waitForRows(page);
  });

  test("pinned Class column shows a shadow cue once content scrolls beneath it", async ({ page }) => {
    await page.setViewportSize({ width: 820, height: 900 });
    const scroller = page.locator(".dt__scroller").first();
    await expect(scroller).not.toHaveAttribute("data-ping-left", "true");
    await scroller.evaluate((el) => {
      el.scrollLeft = 240;
    });
    await expect(scroller).toHaveAttribute("data-ping-left", "true");
    const pinned = table(page).locator('thead th[data-fixed="left"][data-fixed-edge="left"]');
    await expect(pinned).toHaveCount(1);
  });

  test("row selection drives a bulk action bar", async ({ page }) => {
    await page.getByRole("checkbox", { name: /Select row/ }).first().check();
    await expect(page.getByText(/1 class selected/)).toBeVisible();
    await page.getByRole("checkbox", { name: "Select all rows on this page" }).check();
    await expect(page.getByText(/classes selected/)).toBeVisible();
    await page.getByRole("button", { name: "Clear" }).click();
    await expect(page.getByText(/selected/)).toHaveCount(0);
  });

  test("handles 10,000 rows without visible jank in sort and paging", async ({ page }) => {
    await pickSegment(page, "10,000");
    await waitForRows(page);
    await expect(page.getByText(/1–10 of 10000/)).toBeVisible({ timeout: 20_000 });
    const started = Date.now();
    await page.getByRole("columnheader", { name: /^Attendance/ }).getByRole("button").click();
    await expect(page.getByRole("columnheader", { name: /^Attendance/ })).toHaveAttribute("aria-sort", "ascending");
    const elapsed = Date.now() - started;
    test.info().annotations.push({ type: "sort-10k-ms", description: String(elapsed) });
    expect(elapsed).toBeLessThan(1500);
  });
});

test.describe("timetable — server mode", () => {
  test("emits sort and page changes and renders the page + total the server returns", async ({ page }) => {
    await page.goto("/timetable");
    await waitForRows(page);
    await pickSegment(page, "Server-side");
    await waitForRows(page);
    await expect(page.getByText(/1–10 of 64/)).toBeVisible({ timeout: 15_000 });

    const [request] = await Promise.all([
      page.waitForRequest((req) => req.url().includes("/api/classes?") && req.url().includes("sortField=name")),
      page.getByRole("columnheader", { name: /^Class/ }).getByRole("button").click(),
    ]);
    expect(request.url()).toContain("sortOrder=ascend");
    await expect(page.getByRole("columnheader", { name: /^Class/ })).toHaveAttribute("aria-sort", "ascending");

    const [pageRequest] = await Promise.all([page.waitForRequest((req) => req.url().includes("page=2")), page.getByRole("button", { name: "Page 2" }).click()]);
    expect(pageRequest.url()).toContain("pageSize=10");
    await expect(page.getByText(/11–20 of 64/)).toBeVisible({ timeout: 15_000 });
  });
});
