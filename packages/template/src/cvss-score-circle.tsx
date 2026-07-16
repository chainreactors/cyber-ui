interface CVSSScoreCircleProps {
  score: number
  size?: number
  strokeWidth?: number
}

export function CVSSScoreCircle({ score, size = 120, strokeWidth = 8 }: CVSSScoreCircleProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const strokeDasharray = circumference
  const strokeDashoffset = circumference - (score / 10) * circumference

  const getScoreColor = (value: number) => {
    if (value >= 9.0) return '#dc2626'
    if (value >= 7.0) return '#ea580c'
    if (value >= 4.0) return '#ca8a04'
    if (value >= 0.1) return '#16a34a'
    return '#6b7280'
  }

  const scoreColor = getScoreColor(score)

  return (
    <div className="flex items-center justify-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          className="transform -rotate-90"
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={scoreColor}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-3xl font-bold"
            style={{ color: scoreColor }}
          >
            {score.toFixed(1)}
          </span>
          <span className="text-xs text-gray-500 font-medium">Score</span>
        </div>
      </div>
    </div>
  )
}
