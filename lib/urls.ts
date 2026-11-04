/**
 * Protocol-relative wiki image URLs ("//static.wikitide.net/...") → https.
 */
export function httpsUrl(url: string): string {
  return url.startsWith("//") ? `https:${url}` : url;
}
