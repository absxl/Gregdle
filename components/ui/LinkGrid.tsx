/**
 * 2x2 quick-links grid: repo, developer site, GTNH official, Ko-fi.
 * Shared by the leaderboard and home pages.
 */
export function LinkGrid() {
  return (
    <section aria-label="Links" className="grid w-full grid-cols-2 gap-3">
      <a
        href="https://github.com/absxl/Gregdle"
        target="_blank"
        rel="noreferrer"
        className="btn justify-start gap-2.5 py-3"
        title="Source code and issue tracker"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.55 0-.27-.01-1.17-.02-2.12-3.2.7-3.88-1.36-3.88-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.18 1.76 1.18 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.68 0-1.26.45-2.28 1.18-3.09-.12-.29-.51-1.46.11-3.04 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.78 0c2.2-1.49 3.17-1.18 3.17-1.18.62 1.58.23 2.75.11 3.04.74.81 1.18 1.83 1.18 3.09 0 4.41-2.69 5.38-5.25 5.67.41.35.77 1.05.77 2.12 0 1.53-.01 2.76-.01 3.14 0 .3.2.66.8.55A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z" />
        </svg>
        THE REPO
      </a>
      <a
        href="https://carletti.work"
        target="_blank"
        rel="noreferrer"
        className="btn justify-start gap-2.5 py-3"
        title="The developer's site"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
        MY SITE
      </a>
      <a
        href="https://www.gtnewhorizons.com"
        target="_blank"
        rel="noreferrer"
        className="btn justify-start gap-2.5 py-3"
        title="GregTech: New Horizons official site"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/gtnh-logo.png"
          alt=""
          width={16}
          height={16}
          style={{ imageRendering: "pixelated" }}
        />
        GREGTECH OFFICIAL
      </a>
      <a
        href="https://ko-fi.com/absxl"
        target="_blank"
        rel="noreferrer"
        className="btn justify-start gap-2.5 py-3"
        title="Support the project"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M3 11h14v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7z" />
          <path d="M17 11h1.5a2.5 2.5 0 0 1 0 5H17" />
          <path d="M5 8V6a3 3 0 0 1 3-3h8a3 3 0 0 1 3 3v5" />
        </svg>
        KO-FI
      </a>
    </section>
  );
}
