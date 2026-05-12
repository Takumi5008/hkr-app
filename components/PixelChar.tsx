import { CharDef } from '@/lib/characters'

interface Props {
  char: CharDef
  stageIndex: number
  size?: number
  className?: string
}

export default function PixelChar({ char, stageIndex, size = 48, className = '' }: Props) {
  const stage = char.stages[Math.min(stageIndex, char.stages.length - 1)]
  const palette = char.palette
  const cellSize = size / 12

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ imageRendering: 'pixelated' }}
    >
      {stage.grid.map((row, y) =>
        row.map((colorIdx, x) => {
          if (colorIdx === 0) return null
          return (
            <rect
              key={`${x}-${y}`}
              x={x}
              y={y}
              width={1}
              height={1}
              fill={palette[colorIdx] ?? 'transparent'}
            />
          )
        })
      )}
    </svg>
  )
}
