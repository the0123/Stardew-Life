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

function TileCell({ data }: { data: Tile }) {
  if (!data) {
    return (
      <div className="aspect-square rounded bg-farm-soil border border-farm-brown opacity-40" />
    )
  }

  const bg = CATEGORY_BG[data.category] ?? 'bg-gray-500'
  const withered = data.stage === -1

  return (
    <div
      className={`aspect-square rounded border ${bg} flex items-center justify-center text-base transition-opacity
        ${withered ? 'opacity-25 grayscale' : 'opacity-80 hover:opacity-100'}`}
      title={`${data.type} · ${data.category} · stage ${data.stage}`}
    >
      {STAGE_EMOJI[data.stage] ?? '🌱'}
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
