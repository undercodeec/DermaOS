import type { ReactElement } from "react";

export const ICON_SHAPES: Record<string, ReactElement> = {
  dashboard: (
    <g>
      <rect x="3" y="3" width="7.5" height="9.5" rx="1.8" />
      <rect x="13.5" y="3" width="7.5" height="5.5" rx="1.8" />
      <rect x="13.5" y="11.5" width="7.5" height="9.5" rx="1.8" />
      <rect x="3" y="15.5" width="7.5" height="5.5" rx="1.8" />
    </g>
  ),
  calendar: (
    <g>
      <rect x="3" y="5" width="18" height="16" rx="2.2" />
      <path d="M3 10.2h18M8 3v4M16 3v4" />
    </g>
  ),
  users: (
    <g>
      <circle cx="9" cy="8" r="3.4" />
      <path d="M3.6 19.6c.5-3.4 2.7-5.3 5.4-5.3s4.9 1.9 5.4 5.3" />
      <path d="M15.8 5.3a3.4 3.4 0 0 1 0 5.4M17.2 14.7c1.8.8 3 2.5 3.3 4.9" />
    </g>
  ),
  flask: (
    <g>
      <path d="M9.7 3.2v5.6l-5 8.7a1.9 1.9 0 0 0 1.7 2.9h11.2a1.9 1.9 0 0 0 1.7-2.9l-5-8.7V3.2" />
      <path d="M8.2 3.2h7.6M7.4 14.6h9.2" />
    </g>
  ),
  syringe: (
    <g>
      <path d="M17.5 4.2l2.3 2.3M20.6 3.4l-1.9 1.9M15.6 6.1l2.3 2.3" />
      <path d="M16.7 7.2l-7.6 7.6a2 2 0 0 1-1.4.6H5.5v-2.2c0-.5.2-1 .6-1.4l7.6-7.6" />
      <path d="M5.5 18.5l-2.3 2.3M11 9l2 2" />
    </g>
  ),
  receipt: (
    <g>
      <path d="M6 3.5h12V21l-2-1.5-2 1.5-2-1.5L10 21l-2-1.5L6 21z" />
      <path d="M9.3 8.2h5.4M9.3 12h5.4" />
    </g>
  ),
  box: (
    <g>
      <path d="M3.5 8l8.5-4.7L20.5 8v8L12 20.7 3.5 16z" />
      <path d="M3.5 8l8.5 4.7L20.5 8M12 12.7v8" />
    </g>
  ),
  search: (
    <g>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.5 15.5L21 21" />
    </g>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  chevL: <path d="M14.5 5.5L8 12l6.5 6.5" />,
  chevR: <path d="M9.5 5.5L16 12l-6.5 6.5" />,
  chevD: <path d="M5.5 9.5L12 16l6.5-6.5" />,
  clock: (
    <g>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.2V12l3.2 2" />
    </g>
  ),
  file: (
    <g>
      <path d="M6 3h8l4 4v14H6z" />
      <path d="M14 3v4h4M9 12h6M9 15.6h6" />
    </g>
  ),
  camera: (
    <g>
      <path d="M4 8h3l1.6-2.4h6.8L17 8h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="13.5" r="3.4" />
    </g>
  ),
  pen: (
    <g>
      <path d="M4 20l.9-3.8L16.4 4.7a1.7 1.7 0 0 1 2.4 0l.5.5a1.7 1.7 0 0 1 0 2.4L7.8 19.1z" />
      <path d="M14.5 6.6l2.9 2.9" />
    </g>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  alert: (
    <g>
      <path d="M12 3.5L21.5 20H2.5z" />
      <path d="M12 9.5v4.5M12 17.3v.2" />
    </g>
  ),
  pill: (
    <g>
      <rect x="3.2" y="9.2" width="17.6" height="5.6" rx="2.8" transform="rotate(-35 12 12)" />
      <path d="M9.3 8.3l5.4 7.4" />
    </g>
  ),
  user: (
    <g>
      <circle cx="12" cy="8" r="3.7" />
      <path d="M5.4 20.4c.6-3.8 3.2-6 6.6-6s6 2.2 6.6 6" />
    </g>
  ),
  trash: (
    <g>
      <path d="M4.5 6.5h15M9 6.5V4.3h6v2.2M6.5 6.5l1 14h9l1-14" />
    </g>
  ),
  lock: (
    <g>
      <rect x="5" y="11" width="14" height="9.5" rx="1.8" />
      <path d="M8.2 11V8a3.8 3.8 0 0 1 7.6 0v3" />
    </g>
  ),
  layers: (
    <g>
      <path d="M12 3.2L21 7.6l-9 4.4-9-4.4z" />
      <path d="M3 12l9 4.4 9-4.4M3 16.4l9 4.4 9-4.4" />
    </g>
  ),
  card: (
    <g>
      <rect x="2.5" y="5" width="19" height="14" rx="2.4" />
      <path d="M2.5 9.5h19M6 14.6h4.5" />
    </g>
  ),
  send: (
    <g>
      <path d="M21 3.5L10.5 14M21 3.5l-6.7 17.5-3.8-7.3-7.3-3.8z" />
    </g>
  ),
  chat: (
    <g>
      <path d="M4 5.5h16a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5H9.5L5 21v-3.5H4A1.5 1.5 0 0 1 2.5 16V7A1.5 1.5 0 0 1 4 5.5z" />
      <path d="M7 10h10M7 13h6" />
    </g>
  ),
  stetho: (
    <g>
      <path d="M5 3.5v6a4.5 4.5 0 0 0 9 0v-6" />
      <path d="M4 3.5h2M13 3.5h2M9.5 14v2.5a4.5 4.5 0 0 0 9 0V14" />
      <circle cx="18.5" cy="11.5" r="2.4" />
    </g>
  ),
};

interface IconProps {
  name: keyof typeof ICON_SHAPES | string;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function Icon({ name, size = 18, className, style }: IconProps) {
  const shape = ICON_SHAPES[name] ?? ICON_SHAPES.file;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      style={style}
      aria-hidden="true"
    >
      {shape}
    </svg>
  );
}
