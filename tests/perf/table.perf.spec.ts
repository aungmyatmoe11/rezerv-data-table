import { expect, test, type Page } from "@playwright/test";

/**
 * Wall-clock budgets measured in headless Chromium on the production build.
 * Each number is recorded as an annotation so CI output doubles as the README's table.
 */
const SORT_BUDGET_MS = 200;
const SAMPLES = 5;

function p95(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)] ?? 0;
}

async function measureSortCycle(page: Page, header: string): Promise<number> {
  const button = page.getByRole("columnheader", { name: new RegExp(`^${header}`) }).getByRole("button");
  return page.evaluate(async ({ selector }) => {
    const th = [...document.querySelectorAll("th")].find((el) => (el.textContent ?? "").startsWith(selector));
    const btn = th?.querySelector("button");
    if (!btn) throw new Error(`no sort button for ${selector}`);
    const before = th?.getAttribute("aria-sort");
    const started = performance.now();
    btn.click();
    await new Promise<void>((resolve) => {
      const check = (): void => {
        if (th?.getAttribute("aria-sort") !== before) resolve();
        else requestAnimationFrame(check);
      };
      check();
    });
    // one more frame so the row paint that follows the state change is inside the measurement
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return performance.now() - started;
  }, { selector: header }).finally(() => button); // keep the locator referenced for readability
}

test.describe("performance budgets", () => {
  test("client sort over 10,000 rows (paginated): p95 under budget", async ({ page }) => {
    await page.goto("/playground?rows=10000");
    await expect(page.locator(".dt tbody tr.dt__tr").first()).toBeVisible();
    const samples: number[] = [];
    for (let i = 0; i < SAMPLES; i += 1) samples.push(await measureSortCycle(page, "Attendance"));
    const worst = p95(samples);
    test.info().annotations.push({ type: "sort-10k-paginated-p95-ms", description: worst.toFixed(1) });
    expect(worst).toBeLessThan(SORT_BUDGET_MS);
  });

  test("client sort over 10,000 rows (virtual, no pagination): p95 under budget", async ({ page }) => {
    await page.goto("/playground?rowHeight=44&rows=10000&pagination=false&scrollY=fixed&virtual=true");
    await expect(page.locator(".dt tbody tr.dt__tr").first()).toBeVisible();
    const samples: number[] = [];
    for (let i = 0; i < SAMPLES; i += 1) samples.push(await measureSortCycle(page, "Attendance"));
    const worst = p95(samples);
    test.info().annotations.push({ type: "sort-10k-virtual-p95-ms", description: worst.toFixed(1) });
    expect(worst).toBeLessThan(SORT_BUDGET_MS);
  });

  test("virtual scroll keeps the DOM small and frames under budget (p95 < 32ms)", async ({ page }) => {
    await page.goto("/playground?rowHeight=44&rows=10000&pagination=false&scrollY=fixed&virtual=true");
    const rows = page.locator(".dt tbody tr.dt__tr");
    await expect(rows.first()).toBeVisible();
    const result = await page.evaluate(async () => {
      const scroller = document.querySelector<HTMLElement>(".dt__scroller");
      if (!scroller) throw new Error("no scroller");
      const frames: number[] = [];
      let last = performance.now();
      let maxRows = 0;
      for (let step = 0; step < 60; step += 1) {
        scroller.scrollTop += 44 * 6;
        await new Promise((resolve) => requestAnimationFrame(resolve));
        const now = performance.now();
        frames.push(now - last);
        last = now;
        maxRows = Math.max(maxRows, document.querySelectorAll(".dt tbody tr.dt__tr").length);
      }
      // first frames include layout of the fresh page; measure steady state
      const steady = frames.slice(5).sort((a, b) => a - b);
      const p95Frame = steady[Math.min(steady.length - 1, Math.ceil(steady.length * 0.95) - 1)] ?? 0;
      return { maxRows, longest: Math.max(...frames), p95: p95Frame, mean: steady.reduce((a, b) => a + b, 0) / steady.length };
    });
    test.info().annotations.push({ type: "virtual-scroll-frame-p95-ms", description: result.p95.toFixed(1) });
    test.info().annotations.push({ type: "virtual-scroll-frame-mean-ms", description: result.mean.toFixed(1) });
    test.info().annotations.push({ type: "virtual-scroll-longest-frame-ms", description: result.longest.toFixed(1) });
    test.info().annotations.push({ type: "virtual-scroll-max-mounted-rows", description: String(result.maxRows) });
    expect(result.maxRows).toBeLessThan(40);
    expect(result.p95).toBeLessThan(32);
    expect(result.longest).toBeLessThan(120);
  });

  test("page change over 10,000 rows does not re-sort (stays well under budget)", async ({ page }) => {
    await page.goto("/playground?rows=10000");
    await expect(page.locator(".dt tbody tr.dt__tr").first()).toBeVisible();
    await page.getByRole("columnheader", { name: /^Attendance/ }).getByRole("button").click();
    await expect(page.getByRole("columnheader", { name: /^Attendance/ })).toHaveAttribute("aria-sort", "ascending");
    const elapsed = await page.evaluate(async () => {
      const next = document.querySelector<HTMLButtonElement>('button[aria-label="Next page"]');
      if (!next) throw new Error("no next button");
      const started = performance.now();
      next.click();
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return performance.now() - started;
    });
    test.info().annotations.push({ type: "page-change-10k-ms", description: elapsed.toFixed(1) });
    expect(elapsed).toBeLessThan(100);
  });
});
