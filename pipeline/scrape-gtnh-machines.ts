import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { PoliteFetcher, readTextIfExists } from "./lib/fetch-cache";

/**
 * GTNH machines scraper (M1 probe).
 *
 * 1. Reads the cached sitemap URL list (pipeline/cache/sitemap-urls.txt,
 *    downloaded once from wiki.gtnewhorizons.com).
 * 2. Filters to article pages under /wiki/.
 * 3. Politely fetches each page, caching raw HTML under
 *    pipeline/cache/gtnh/pages/<slug>.html so re-runs are free.
 *
 * Classification (is this page a machine?) happens later in the normalizer,
 * keyed off the page's infobox — the scraper just collects.
 *
 * Usage: pnpm tsx pipeline/scrape-gtnh-machines.ts [--limit N]
 */

const ROOT = path.resolve(import.meta.dirname, "..");
const CACHE = path.join(ROOT, "pipeline", "cache");
const PAGES_DIR = path.join(CACHE, "gtnh", "pages");
const SITEMAP_LIST = path.join(CACHE, "sitemap-urls.txt");

const ARTICLE_PREFIX = "https://wiki.gtnewhorizons.com/wiki/";
const NAMESPACE_EXCLUDE =
  /^(Template|File|User|User_talk|Talk|GTNH_Wiki|Help|MediaWiki|Category|Property|Module):/i;

function slugFor(url: string): string {
  return decodeURIComponent(url.slice(ARTICLE_PREFIX.length)).replace(/[^\w.-]+/g, "_");
}

async function main() {
  const limitArg = process.argv.includes("--limit")
    ? Number(process.argv[process.argv.indexOf("--limit") + 1])
    : undefined;

  const list = await readTextIfExists(SITEMAP_LIST);
  if (!list) {
    console.error(`Missing ${SITEMAP_LIST}. Download the sitemap first.`);
    process.exit(1);
  }

  const articles = list
    .split(/\r?\n/)
    .filter((l) => l.startsWith(ARTICLE_PREFIX))
    .map((l) => l.trim())
    .filter((l) => !NAMESPACE_EXCLUDE.test(decodeURIComponent(l.slice(ARTICLE_PREFIX.length))))
    .filter((l) => !/[?]/.test(l))
    .sort();

  const targets = limitArg ? articles.slice(0, limitArg) : articles;
  console.log(`Articles to fetch: ${targets.length} (of ${articles.length} in sitemap)`);

  const fetcher = new PoliteFetcher(path.join(CACHE, "http"));
  await mkdir(PAGES_DIR, { recursive: true });

  let fetched = 0;
  let cached = 0;
  let failed = 0;

  for (const [i, url] of targets.entries()) {
    const slug = slugFor(url);
    const file = path.join(PAGES_DIR, `${slug}.html`);
    if (await readTextIfExists(file)) {
      cached++;
      continue;
    }
    try {
      const { body } = await fetcher.fetch(url);
      await writeFile(file, body, "utf8");
      fetched++;
      if (fetched % 25 === 0) {
        console.log(`[${i + 1}/${targets.length}] fetched ${slug}`);
      }
    } catch (err) {
      failed++;
      console.error(`[${i + 1}/${targets.length}] FAILED ${slug}: ${err}`);
    }
  }

  console.log(`Done. fetched=${fetched} cached=${cached} failed=${failed}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
