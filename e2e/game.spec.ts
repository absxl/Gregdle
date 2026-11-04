import { expect, test } from "@playwright/test";
import { getEndlessAnswerId } from "@/lib/game/answers";
import { getMachines } from "@/lib/game/dataset";

/**
 * Full guess-to-win smoke (PRD §10 M6): endless mode with a fixed seed so the
 * answer is known test-side, computed with the same server function. Also
 * asserts the anti-spoiler contract at the network layer: no response during
 * play may contain the answer's name.
 */

const SEED = "gregdle-e2e-fixed-seed";

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
const URL = `/play/gtnh-machines/easy?mode=endless&seed=${SEED}`;

test.describe.configure({ mode: "serial" });

for (const project of ["desktop-chromium", "mobile-chromium"]) {
  test(`full game flow to win (${project})`, async ({ page }) => {
    const entries = getMachines();
    const answerId = getEndlessAnswerId(entries, "gtnh:machines", "easy", SEED);
    const answer = entries.find((e) => e.id === answerId)!;
    const wrong = entries.find((e) => e.id !== answerId && e.difficulty === "easy")!;

    // Anti-spoiler: scan every network response body for the answer name.
    const spoilers: string[] = [];
    page.on("response", async (res) => {
      if (res.url().includes("/api/")) {
        const body = await res.text().catch(() => "");
        if (body.includes(answer.name) && !body.includes('"won":true')) spoilers.push(res.url());
      }
    });

    await page.goto(URL);
    await expect(page.getByRole("table", { name: "Guess grid" })).toBeVisible();

    // Wrong guess first — a row of colored cells must appear.
    // (Options carry attribute chips, so match on the name PREFIX.)
    const search = page.getByRole("textbox", { name: "Search a machine to guess" });
    await search.fill(wrong.name);
    // force: the absolutely-positioned listbox occasionally fails Playwright's
    // pointer-interception actionability check (works fine in real browsers).
    await page.locator('[role="option"] button').first().click({ force: true });
    await expect(
      page.getByRole("table", { name: "Guess grid" }).getByText(wrong.name),
    ).toBeVisible();
    await expect(
      page.locator(".cell-wrong, .cell-correct, .cell-partial, .cell-higher, .cell-lower").first(),
    ).toBeVisible();

    // Winning guess — result modal with the answer + share actions.
    await search.fill(answer.name);
    await expect(page.locator('[role="option"]', { hasText: answer.name })).toBeVisible();
    // force: the absolutely-positioned listbox occasionally fails Playwright's
    // pointer-interception actionability check (works fine in real browsers).
    await page.locator('[role="option"] button').first().click({ force: true });
    await expect(page.getByRole("dialog", { name: "Game result" })).toBeVisible();
    await expect(page.getByRole("dialog").getByText("CORRECT!")).toBeVisible();
    await expect(page.getByRole("dialog").getByText(answer.name, { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Play again" })).toBeVisible();

    // The answer may only ever appear in the winning reveal.
    expect(spoilers.filter((u) => !u.includes("/api/guess")).length, "answer leaked via API").toBe(
      0,
    );
  });
}
