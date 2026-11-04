export const metadata = {
  title: "Privacy Policy — Gregdle",
  description: "What Gregdle stores, what it doesn't, and how ads work.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-4 pb-12">
      <header className="mt-2">
        <h1 className="font-pixel text-5xl leading-none tracking-wide">PRIVACY POLICY</h1>
      </header>

      <section className="panel p-5 text-sm leading-relaxed">
        <p className="mb-4 text-xs text-muted">Last updated: 4 November 2026.</p>

        <h2 className="mb-2 text-base font-black text-accent">Local storage</h2>
        <p className="mb-4">
          Gregdle stores your game progress (guesses, streaks, stats) in your browser&apos;s
          localStorage. This data never leaves your device unless you create an account. Clearing
          your browser data removes it.
        </p>

        <h2 className="mb-2 text-base font-black text-accent">Accounts (optional)</h2>
        <p className="mb-4">
          If you create an account, we store your Discord account identity (user id, username, avatar), a display name, and
          your game results — solely to sync your progress and show leaderboards. We never sell
          personal data. Authentication is handled by Supabase Auth.
        </p>

        <h2 className="mb-2 text-base font-black text-accent">Game requests</h2>
        <p className="mb-4">
          Guesses are checked by our server so the daily answer stays secret. These requests include
          your IP address (standard for any web request), used only for rate limiting. We run
          privacy-friendly, aggregate-free analytics at most; no invasive tracking.
        </p>

        <h2 className="mb-2 text-base font-black text-accent">Advertising</h2>
        <p className="mb-4">
          Gregdle is free and currently shows no advertising. If advertising is ever introduced,
          this policy will be updated with the details before it goes live.
        </p>

        <h2 className="mb-2 text-base font-black text-accent">Contact</h2>
        <p>
          Questions about this policy or your data: open an issue on the Gregdle repository or reach
          out via the repository owner&apos;s GitHub profile.
        </p>
      </section>
    </main>
  );
}
