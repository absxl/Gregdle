import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Polite, cache-first fetcher for the data pipeline (PRD §5 P1).
 *
 * - Every response body is cached on disk keyed by URL hash; re-runs never
 *   re-hit the site (idempotent pipeline runs).
 * - Requests are rate-limited (default 2000 ms) and carry an identifying
 *   User-Agent per the wiki robots.txt etiquette.
 */

const USER_AGENT =
  "GregdleBot/0.1 (https://github.com/absxl/Gregdle; data pipeline for the Gregdle guessing game)";

export class PoliteFetcher {
  private lastRequestAt = 0;

  constructor(
    private readonly cacheDir: string,
    private readonly delayMs = 2000,
  ) {}

  private cachePath(url: string): string {
    const hash = createHash("sha1").update(url).digest("hex").slice(0, 20);
    return path.join(this.cacheDir, `${hash}.body`);
  }

  private async throttle(): Promise<void> {
    const elapsed = Date.now() - this.lastRequestAt;
    if (elapsed < this.delayMs) {
      await new Promise((resolve) => setTimeout(resolve, this.delayMs - elapsed));
    }
    this.lastRequestAt = Date.now();
  }

  async fetch(url: string): Promise<{ body: string; fromCache: boolean }> {
    const file = this.cachePath(url);
    const cached = await readFile(file, "utf8").catch(() => null);
    if (cached !== null) return { body: cached, fromCache: true };

    await this.throttle();
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml" },
      redirect: "follow",
    });
    if (!res.ok) {
      throw new Error(`GET ${url} -> HTTP ${res.status}`);
    }
    const body = await res.text();
    await mkdir(this.cacheDir, { recursive: true });
    await writeFile(file, body, "utf8");
    return { body, fromCache: false };
  }
}

export async function readTextIfExists(file: string): Promise<string | null> {
  return readFile(file, "utf8").catch(() => null);
}
