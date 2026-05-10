import { useEffect, useState } from 'react'
import { type Tile } from '../../stores/farmStore'

const CATEGORY_BG: Record<string, string> = {
  health: 'bg-green-500',
  work: 'bg-yellow-600',
  learning: 'bg-blue-500',
  social: 'bg-pink-500',
}

const STAGE_EMOJI: Record<number, string> = {
  [-1]: '🥀',
  0: '🌱',
  1: '🌿',
  2: '🌾',
  3: '✨',
}

const STAGE_LABEL: Record<number, string> = {
  [-1]: 'Withered',
  0: 'Seedling',
  1: 'Growing',
  2: 'Almost ready',
  3: 'Ready to harvest',
}

interface TileCellProps {
  data: Tile
  isActive: boolean
  onActivate: (e: React.MouseEvent) => void
}

function TileCell({ data, isActive, onActivate }: TileCellProps) {
  if (!data) {
    return (
      <div className="aspect-square rounded bg-farm-soil border border-farm-brown opacity-40" />
    )
  }

  const bg = CATEGORY_BG[data.category] ?? 'bg-gray-500'
  const withered = data.stage === -1
  const count = data.log_count ?? 1
  const displayTitle = data.title ?? data.type

  return (
    <div className="relative group aspect-square" onClick={onActivate}>
      <div
        className={`w-full h-full rounded border ${bg} flex items-center justify-center text-base transition-opacity cursor-pointer
          ${withered ? 'opacity-25 grayscale' : 'opacity-80 hover:opacity-100'}`}
      >
        {STAGE_EMOJI[data.stage] ?? '🌱'}
      </div>

      {/* Count badge */}
      {count > 1 && (
        <div className="pointer-events-none absolute -top-1 -right-1 bg-farm-gold text-green-900 text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none z-10">
          {count > 9 ? '9+' : count}
        </div>
      )}

      {/* Tooltip — visible on hover (desktop) or when tapped (mobile) */}
      <div className={`pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50
        transition-opacity duration-150 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
        <div className="bg-green-950 border border-farm-gold rounded-lg px-3 py-2 shadow-xl text-center whitespace-nowrap">
          <p className="text-white text-xs font-semibold">
            {displayTitle}{count > 1 ? ` (${count}x)` : ''}
          </p>
          <p className="text-farm-gold text-xs">{STAGE_LABEL[data.stage] ?? 'Growing'}</p>
        </div>
        <div className="w-2 h-2 bg-green-950 border-r border-b border-farm-gold rotate-45 mx-auto -mt-1" />
      </div>
    </div>
  )
}

export default function FarmGrid({ grid }: { grid: Tile[][] }) {
  const cols = grid[0]?.length ?? 8
  const [activeTile, setActiveTile] = useState<number | null>(null)

  useEffect(() => {
    const dismiss = () => setActiveTile(null)
    document.addEventListener('click', dismiss)
    return () => document.removeEventListener('click', dismiss)
  }, [])

  const tiles = grid.flat()

  return (
    <div
      className="grid gap-1 p-3 bg-black/20 rounded-xl"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {tiles.map((tile, i) => (
        <TileCell
          key={i}
          data={tile}
          isActive={activeTile === i}
          onActivate={e => {
            e.stopPropagation()
            setActiveTile(activeTile === i ? null : i)
          }}
        />
      ))}
    </div>
  )
}
