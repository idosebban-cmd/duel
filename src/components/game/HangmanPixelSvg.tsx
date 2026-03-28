/**
 * Pixel-art Hangman stages (0–6 wrong guesses). Rects only — no paths.
 */
const BG = '#12122A';
const GALLOW = '#4EFFC4';
const FIG = '#FF6BA8';

type R = { x: number; y: number; w: number; h: number; fill: string };

function rectsForStage(wrongCount: number): R[] {
  const u = 4;
  const out: R[] = [{ x: 0, y: 0, w: 30 * u, h: 34 * u, fill: BG }];

  const add = (x: number, y: number, w: number, h: number, fill: string) =>
    out.push({ x: x * u, y: y * u, w: w * u, h: h * u, fill });

  // Base
  add(2, 31, 18, 1, GALLOW);
  // Pole
  add(8, 6, 1, 26, GALLOW);
  // Beam
  add(8, 6, 14, 1, GALLOW);
  // Rope
  add(20, 7, 1, 3, GALLOW);

  const head = wrongCount >= 1;
  const body = wrongCount >= 2;
  const armL = wrongCount >= 3;
  const armR = wrongCount >= 4;
  const legL = wrongCount >= 5;
  const legR = wrongCount >= 6;

  if (head) {
    add(18, 10, 5, 1, FIG);
    add(17, 11, 1, 3, FIG);
    add(23, 11, 1, 3, FIG);
    add(18, 14, 5, 1, FIG);
  }
  if (body) {
    add(20, 15, 1, 8, FIG);
  }
  if (armL) {
    add(16, 16, 4, 1, FIG);
    add(16, 17, 1, 2, FIG);
  }
  if (armR) {
    add(21, 16, 4, 1, FIG);
    add(24, 17, 1, 2, FIG);
  }
  if (legL) {
    add(19, 23, 1, 5, FIG);
    add(17, 28, 3, 1, FIG);
  }
  if (legR) {
    add(21, 23, 1, 5, FIG);
    add(21, 28, 3, 1, FIG);
  }

  return out;
}

export function HangmanPixelSvg({
  wrongCount,
  className,
}: {
  wrongCount: number;
  className?: string;
}) {
  const n = Math.max(0, Math.min(6, wrongCount));
  const list = rectsForStage(n);
  return (
    <svg
      className={className}
      viewBox="0 0 120 136"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      {list.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} fill={r.fill} shapeRendering="crispEdges" />
      ))}
    </svg>
  );
}
