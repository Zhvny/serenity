// Ikon SVG inline (tanpa dependency). stroke=currentColor, ukuran = 1em (ikut font-size).
// aria-hidden secara default; beri `title` untuk ikon bermakna.

export type IconName = "cart" | "warning" | "check" | "arrow-right" | "leaf" | "clock" | "spark" | "sun" | "moon";

const PATHS: Record<IconName, React.ReactNode> = {
  cart: (
    <>
      <circle cx="9" cy="21" r="1" />
      <circle cx="19" cy="21" r="1" />
      <path d="M3 3h2l2.4 12.2a1 1 0 0 0 1 .8h9.7a1 1 0 0 0 1-.8L21 7H6" />
    </>
  ),
  warning: (
    <>
      <path d="M12 3 2.5 20h19L12 3Z" />
      <line x1="12" y1="10" x2="12" y2="14" />
      <line x1="12" y1="17" x2="12" y2="17.01" />
    </>
  ),
  check: <path d="M20 6 9 17l-5-5" />,
  "arrow-right": (
    <>
      <line x1="4" y1="12" x2="19" y2="12" />
      <path d="m13 6 6 6-6 6" />
    </>
  ),
  leaf: (
    <>
      <path d="M11 20A7 7 0 0 1 4 13c0-6 7-9 16-9 0 9-3 16-9 16Z" />
      <path d="M4 20c3-5 7-7 11-8" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  spark: <path d="M12 2v6m0 8v6m10-10h-6M8 12H2m14.5-6.5-4 4m-5 5-4 4m13 0-4-4m-5-5-4-4" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4m11.4-11.4 1.4-1.4" />
    </>
  ),
  moon: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />,
};

export function Icon({ name, title, className }: { name: IconName; title?: string; className?: string }) {
  return (
    <svg
      className={className === undefined ? "icon" : `icon ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      width="1em"
      height="1em"
      role={title === undefined ? undefined : "img"}
      aria-hidden={title === undefined ? true : undefined}
      aria-label={title}
    >
      {title === undefined ? null : <title>{title}</title>}
      {PATHS[name]}
    </svg>
  );
}
