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
      title="Copy Discord tag"
      onClick={() => {
        navigator.clipboard.writeText(tag).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
    >
      {copied ? "copied!" : "⧉ copy tag"}
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
  return (
    <p className="flex flex-wrap items-center gap-3 text-xs font-bold">
      {redditUser && (
        <a
          href={`https://reddit.com/user/${encodeURIComponent(redditUser)}`}
          target="_blank"
          rel="noreferrer"
          className="text-accent hover:underline"
        >
          ↗ reddit.com/u/{redditUser}
        </a>
      )}
      {xUser && (
        <a
          href={`https://x.com/${encodeURIComponent(xUser)}`}
          target="_blank"
          rel="noreferrer"
          className="text-accent hover:underline"
        >
          ↗ x.com/{xUser}
        </a>
      )}
    </p>
  );
}

export { ProfileEditButton };
