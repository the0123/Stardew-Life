const CATEGORIES = [
  { key: 'health',   label: 'Health',   emoji: '💪', bar: 'bg-green-500' },
  { key: 'work',     label: 'Work',     emoji: '💼', bar: 'bg-yellow-500' },
  { key: 'learning', label: 'Learning', emoji: '📚', bar: 'bg-blue-500' },
  { key: 'social',   label: 'Social',   emoji: '🤝', bar: 'bg-pink-500' },
] as const

const XP_PER_BAR = 500

interface Props {
  xp: Record<string, number>
  level: number
  gold: number
}

export default function StatsPanel({ xp, level, gold }: Props) {
  return (
    <div className="bg-green-900/80 rounded-xl p-4 space-y-3">
      <div className="flex justify-between items-center">
        <span className="text-farm-gold font-bold text-sm">Level {level}</span>
        <span className="text-yellow-400 text-sm">🪙 {gold} gold</span>
      </div>
      {CATEGORIES.map(({ key, label, emoji, bar }) => {
        const val = xp[key] ?? 0
        const pct = Math.min((val % XP_PER_BAR) / XP_PER_BAR * 100, 100)
        return (
          <div key={key}>
            <div className="flex justify-between text-xs text-green-300 mb-1">
              <span>{emoji} {label}</span>
              <span>{val} xp</span>
            </div>
            <div className="h-2 bg-green-950 rounded-full overflow-hidden">
              <div
                className={`h-full ${bar} rounded-full transition-all duration-500`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
