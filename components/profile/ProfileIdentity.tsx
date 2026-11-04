"use client";

import { useState } from "react";

/**
 * Client identity block for the profile page (D29): copy-Discord-tag button
 * plus the owner-only Edit profile form. The page itself stays a server
 * component.
 */

import { ProfileEditButton } from "./ProfileExtras";

export function CopyTagButton({ tag }: { tag: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn px-2 py-1 text-xs"
      title={copied ? "Copied" : "Copy Discord tag"}
      onClick={() => {
        navigator.clipboard.writeText(tag).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
    >
      {copied ? (
        "copied!"
      ) : (
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <rect x="9" y="9" width="13" height="13" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      )}
    </button>
  );
}

export function SocialLinks({
  reddit,
  twitter,
}: {
  reddit: string | null;
  twitter: string | null;
}) {
  if (!reddit && !twitter) return null;
  const redditUser = reddit
    ?.replace(/^(https?:\/\/)?(www\.)?(reddit\.com\/user\/)?/i, "")
    .replace(/^u\//i, "");
  const xUser = twitter
    ?.replace(/^(https?:\/\/)?(www\.)?((x\.com)|(twitter\.com)\/)?/i, "")
    .replace(/^@/, "");
  const redditIcon = (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.6 11.5c.05.27.08.55.08.85 0 2.4-2.6 4.35-5.8 4.35S5.08 16.75 5.08 14.35c0-.3.03-.58.08-.85-.38-.23-.63-.64-.63-1.11 0-.73.59-1.32 1.32-1.32.35 0 .66.13.9.35.95-.68 2.28-1.12 3.77-1.17l.68-3.2a.4.4 0 0 1 .47-.31l2.23.49c.16-.32.49-.54.87-.54.54 0 .98.44.98.98s-.44.98-.98.98c-.4 0-.74-.24-.89-.59l-1.99-.44-.57 2.67c1.44.07 2.72.51 3.64 1.17.24-.22.55-.35.9-.35.73 0 1.32.59 1.32 1.32 0 .47-.25.88-.63 1.11zM9.15 15.1c.54 0 .98-.44.98-.98s-.44-.98-.98-.98-.98.44-.98.98.44.98.98.98zm5.7 0c.54 0 .98-.44.98-.98s-.44-.98-.98-.98-.98.44-.98.98.44.98.98.98zm-.7 1.85c-.5.5-1.4.54-2.15.54s-1.65-.04-2.15-.54a.36.36 0 0 1 .51-.51c.32.32 1.02.38 1.64.38s1.32-.06 1.64-.38a.36.36 0 0 1 .51.51z" />
    </svg>
  );
  const xIcon = (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.9 2H22l-6.77 7.74L23.2 22h-6.24l-4.89-6.4L6.47 22H3.35l7.24-8.28L2.4 2h6.4l4.42 5.84L18.9 2zm-1.1 18.1h1.73L7.9 3.8H6.04L17.8 20.1z" />
    </svg>
  );
  return (
    <p className="flex flex-wrap items-center gap-4 text-xs font-bold">
      {redditUser && (
        <a
          href={`https://reddit.com/user/${encodeURIComponent(redditUser)}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 rounded-lg border border-edge bg-surface2 px-2.5 py-1.5 text-foreground hover:border-accent"
          title={`reddit.com/u/${redditUser}`}
        >
          {redditIcon} u/{redditUser}
        </a>
      )}
      {xUser && (
        <a
          href={`https://x.com/${encodeURIComponent(xUser)}`}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 rounded-lg border border-edge bg-surface2 px-2.5 py-1.5 text-foreground hover:border-accent"
          title={`x.com/${xUser}`}
        >
          {xIcon} @{xUser}
        </a>
      )}
    </p>
  );
}

export { ProfileEditButton };
