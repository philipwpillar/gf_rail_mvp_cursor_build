type RailLogoProps = {
  variant?: 'icon' | 'lockup'
  height?: number
  onDark?: boolean
  className?: string
}

export function RailLogo({ variant = 'lockup', height = 36, onDark = false, className }: RailLogoProps) {
  const navy = onDark ? '#FFFFFF' : '#0D3560'
  const teal = '#20E2D7'

  if (variant === 'icon') {
    return (
      <svg
        height={height}
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
      >
        <g transform="translate(50, 45)">
          <rect x="0" y="50" width="22" height="70" fill={navy} />
          <rect x="30" y="25" width="22" height="95" fill={navy} />
          <rect x="60" y="0" width="22" height="75" fill={teal} />
          <path d="M0 120 L60 55 L60 80 L22 120 Z" fill={navy} />
        </g>
      </svg>
    )
  }

  // lockup: icon + wordmark separated by a divider line
  return (
    <svg
      height={height}
      viewBox="0 0 600 200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <g transform="translate(50, 40)">
        <rect x="0" y="50" width="22" height="70" fill={navy} />
        <rect x="30" y="25" width="22" height="95" fill={navy} />
        <rect x="60" y="0" width="22" height="75" fill={teal} />
        <path d="M0 120 L60 55 L60 80 L22 120 Z" fill={navy} />
      </g>
      <line
        x1="165" y1="50" x2="165" y2="150"
        stroke={onDark ? 'rgba(255,255,255,0.2)' : '#E0E0E0'}
        strokeWidth="2"
      />
      <g
        transform="translate(205, 128)"
        fill={navy}
        fontFamily="sans-serif"
        fontWeight="900"
        fontSize="82"
        letterSpacing="2"
      >
        <text x="0" y="0">R</text>
        <text x="72" y="0">A</text>
        <text x="148" y="0">I</text>
        <text x="178" y="0">L</text>
        <rect x="76" y="-33" width="56" height="8" fill={teal} />
      </g>
    </svg>
  )
}
