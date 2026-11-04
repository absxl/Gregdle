/**
 * GregTech item icon (16x16 sprites from the GT5u texture pack, see
 * docs/ATTRIBUTION.md). Rendered pixelated at any size.
 */

const ICONS = ["rank1", "rank2", "rank3", "trophy", "synced", "gold"] as const;

export type ItemIconName = (typeof ICONS)[number];

export function ItemIcon({
  name,
  size = 16,
  className = "",
  title,
}: {
  name: ItemIconName;
  size?: number;
  className?: string;
  title?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/icons/${name}.png`}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      title={title}
      className={`inline-block shrink-0 align-middle ${className}`}
      style={{ imageRendering: "pixelated" }}
    />
  );
}
