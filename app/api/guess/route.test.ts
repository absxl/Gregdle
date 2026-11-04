import { describe, expect, it } from "vitest";
import { POST } from "./route";
import { getMachines } from "@/lib/game/dataset";
import { fallbackDailyAnswerId } from "@/lib/game/answers";

/**
 * Anti-spoiler contract (PRD §7.3/§9): network responses during play must
 * never contain the answer id or name before the game ends.
 */

const TODAY = "2026-11-04";

function guessBody(overrides: Record<string, unknown>) {
  return new Request("http://localhost/api/guess", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      datasetKey: "gtnh:machines",
      difficulty: "hard",
      mode: "daily",
      date: TODAY,
      ...overrides,
    }),
  });
}

describe("POST /api/guess anti-spoiler", () => {
  const entries = getMachines();
  const answerId = fallbackDailyAnswerId(entries, "gtnh:machines", "hard", TODAY);
  const answer = entries.find((e) => e.id === answerId)!;
  const wrongGuess = entries.find((e) => e.id !== answerId)!;

  it("wrong guess returns cells and no trace of the answer", async () => {
    const res = await POST(guessBody({ guessId: wrongGuess.id }));
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).not.toContain(`"answer"`);
    expect(text).not.toContain(answer.id);
    expect(text).not.toContain(answer.name);
    const data = JSON.parse(text);
    expect(data.result.cells).toHaveLength(6);
    expect(data.result.won).toBe(false);
  });

  it("correct guess reveals the answer", async () => {
    const res = await POST(guessBody({ guessId: answerId }));
    const data = await res.json();
    expect(data.result.won).toBe(true);
    expect(data.answer.id).toBe(answerId);
    expect(data.answer.name).toBe(answer.name);
  });

  it("give up reveals the answer with no comparison row", async () => {
    const res = await POST(guessBody({ guessId: "whatever", giveUp: true }));
    const data = await res.json();
    expect(data.gaveUp).toBe(true);
    expect(data.answer.id).toBe(answerId);
    expect(data.result).toBeUndefined();
  });

  it("unknown guess id is 404 without answer leakage", async () => {
    const res = await POST(guessBody({ guessId: "does-not-exist" }));
    expect(res.status).toBe(404);
    const text = await res.text();
    expect(text).not.toContain(answer.id);
    expect(text).not.toContain(answer.name);
  });

  it("endless mode resolves deterministically from the seed", async () => {
    const body = (seed: string) =>
      guessBody({ mode: "endless", seed, date: undefined, guessId: wrongGuess.id });
    const r1 = await POST(body("seed-alpha"));
    const r2 = await POST(body("seed-alpha"));
    const d1 = await r1.json();
    const d2 = await r2.json();
    // Same comparisons for the same guess -> same underlying answer.
    expect(d1.result.cells).toEqual(d2.result.cells);
    expect(d1.result.cells).toHaveLength(6);
  });

  it("rejects bad input without leaking", async () => {
    const res = await POST(
      new Request("http://localhost/api/guess", { method: "POST", body: "not json" }),
    );
    expect(res.status).toBe(400);
  });
});
