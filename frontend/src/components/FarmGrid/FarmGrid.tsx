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

function TileCell({ data }: { data: Tile }) {
  if (!data) {
    return (
      <div className="aspect-square rounded bg-farm-soil border border-farm-brown opacity-40" />
    )
  }

  const bg = CATEGORY_BG[data.category] ?? 'bg-gray-500'
  const withered = data.stage === -1

  return (
    <div className="relative group aspect-square">
      <div
        className={`w-full h-full rounded border ${bg} flex items-center justify-center text-base transition-opacity
          ${withered ? 'opacity-25 grayscale' : 'opacity-80 hover:opacity-100'}`}
      >
        {STAGE_EMOJI[data.stage] ?? '🌱'}
      </div>

      {/* Hover tooltip */}
      <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50
        opacity-0 group-hover:opacity-100 transition-opacity duration-150">
        <div className="bg-green-950 border border-farm-gold rounded-lg px-3 py-2 shadow-xl text-center whitespace-nowrap">
          <p className="text-white text-xs font-semibold">{data.title ?? data.type}</p>
          <p className="text-farm-gold text-xs">{STAGE_LABEL[data.stage] ?? 'Growing'}</p>
        </div>
        <div className="w-2 h-2 bg-green-950 border-r border-b border-farm-gold rotate-45 mx-auto -mt-1" />
      </div>
    </div>
  )
}

export default function FarmGrid({ grid }: { grid: Tile[][] }) {
  const cols = grid[0]?.length ?? 8

  return (
    <div
      className="grid gap-1 p-3 bg-black/20 rounded-xl"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {grid.flat().map((tile, i) => (
        <TileCell key={i} data={tile} />
      ))}
    </div>
  )
}
