export const CURSOR_COLORS = [
  '#c8a96a', // gold
  '#60a5fa', // blue-400
  '#f87171', // red-400
  '#34d399', // emerald-400
  '#a78bfa', // violet-400
  '#fb923c', // orange-400
  '#e879f9', // fuchsia-400
  '#2dd4bf', // teal-400
];

export function getRandomCursorColor(): string {
  return CURSOR_COLORS[Math.floor(Math.random() * CURSOR_COLORS.length)];
}
