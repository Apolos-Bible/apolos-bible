interface RemoteCursorProps {
  x: number;
  y: number;
  color: string;
  name: string;
}

export function RemoteCursor({ x, y, color, name }: RemoteCursorProps) {
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className="pointer-events-none absolute z-[10000]"
      style={{
        left: x,
        top: y,
        transform: 'translate(-4px, -4px)',
        transition: 'left 80ms linear, top 80ms linear',
      }}
    >
      {/* Cursor dot */}
      <div
        className="w-4 h-4 rounded-full shadow-sm flex items-center justify-center"
        style={{ backgroundColor: color }}
      >
        <svg
          width="10"
          height="10"
          viewBox="0 0 16 16"
          fill="none"
        >
          <path
            d="M2 2.5L6.5 13L8 8L13 6.5L2 2.5Z"
            fill="white"
            stroke="white"
            strokeWidth="0.8"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* Name badge */}
      <div
        className="absolute left-5 -top-2 whitespace-nowrap rounded-md px-2.5 py-1.5 shadow-md"
        style={{ backgroundColor: color }}
      >
        <p className="text-xs font-medium text-white leading-none">{name}</p>
      </div>
    </div>
  );
}
