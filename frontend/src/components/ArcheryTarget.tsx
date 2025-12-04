import { useRef, useCallback } from 'react';
import type { ArcheryScore } from '../types';

interface ArcheryTargetProps {
  scores: ArcheryScore[]; // Current end's scores with positions
  onTargetClick: (x: number, y: number, score: string) => void;
  disabled?: boolean;
  size?: number; // Size in pixels
}

// Target ring definitions (from center outward)
// Adjusted for the actual target image proportions
const TARGET_RINGS = [
  { maxRadius: 4, score: 'X' },    // X (inner 10)
  { maxRadius: 8, score: '10' },   // 10
  { maxRadius: 12, score: '9' },   // 9 (yellow)
  { maxRadius: 16, score: '8' },   // 8 (red)
  { maxRadius: 20, score: '7' },   // 7 (red)
  { maxRadius: 24, score: '6' },   // 6 (blue)
  { maxRadius: 28, score: '5' },   // 5 (blue)
  { maxRadius: 32, score: '4' },   // 4 (black)
  { maxRadius: 36, score: '3' },   // 3 (black)
  { maxRadius: 40, score: '2' },   // 2 (white)
  { maxRadius: 44, score: '1' },   // 1 (white)
  { maxRadius: 100, score: 'M' },  // Miss
];

// Calculate score from position (0-100 coordinate system, center at 50,50)
function calculateScoreFromPosition(x: number, y: number): string {
  const centerX = 50;
  const centerY = 50;
  const distance = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));

  for (const ring of TARGET_RINGS) {
    if (distance <= ring.maxRadius) {
      return ring.score;
    }
  }
  return 'M';
}

// Arrow marker colors by arrow number
const ARROW_COLORS = [
  '#DC2626', // 1 - red
  '#2563EB', // 2 - blue
  '#16A34A', // 3 - green
  '#9333EA', // 4 - purple
  '#EA580C', // 5 - orange
  '#0891B2', // 6 - cyan
];

export function ArcheryTarget({ scores, onTargetClick, disabled = false, size = 280 }: ArcheryTargetProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const handleClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();

    // Calculate position relative to container (0-100 coordinate system)
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const score = calculateScoreFromPosition(x, y);
    onTargetClick(Math.round(x), Math.round(y), score);
  }, [disabled, onTargetClick]);

  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (disabled || !containerRef.current) return;
    e.preventDefault();

    const touch = e.changedTouches[0];
    const rect = containerRef.current.getBoundingClientRect();

    const x = ((touch.clientX - rect.left) / rect.width) * 100;
    const y = ((touch.clientY - rect.top) / rect.height) * 100;

    const score = calculateScoreFromPosition(x, y);
    onTargetClick(Math.round(x), Math.round(y), score);
  }, [disabled, onTargetClick]);

  return (
    <div
      ref={containerRef}
      onClick={handleClick}
      onTouchEnd={handleTouchEnd}
      className={`relative ${disabled ? '' : 'cursor-crosshair'} touch-none`}
      style={{ width: size, height: size, maxWidth: '100%' }}
    >
      {/* Target image */}
      <img
        src="/images/target.png"
        alt="Archery Target"
        className="w-full h-full object-contain pointer-events-none"
        draggable={false}
      />

      {/* Arrow markers overlay */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 100 100"
      >
        {scores.map((score, index) => {
          if (score.positionX == null || score.positionY == null) return null;
          const color = ARROW_COLORS[index % ARROW_COLORS.length];
          return (
            <g key={score.id}>
              {/* Arrow hole */}
              <circle
                cx={score.positionX}
                cy={score.positionY}
                r="1.5"
                fill={color}
                stroke="#FFF"
                strokeWidth="0.4"
              />
              {/* Arrow number */}
              <text
                x={score.positionX}
                y={score.positionY + 0.5}
                textAnchor="middle"
                fontSize="1.8"
                fill="#FFF"
                fontWeight="bold"
              >
                {score.arrowNumber}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export { calculateScoreFromPosition };
