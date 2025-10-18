import React from 'react'

export interface AvatarConfig {
  id: string
  name: string
  backgroundColor: string
  accentColor: string
  pattern: 'geometric' | 'abstract' | 'minimal'
  shape: 'circle' | 'square' | 'hexagon'
}

interface PlayerAvatarProps {
  avatar: string // ID del avatar
  size?: 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const AVATAR_CONFIGS: Record<string, AvatarConfig> = {
  'purple-geo': {
    id: 'purple-geo',
    name: 'Púrpura Geométrico',
    backgroundColor: '#9333ea',
    accentColor: '#c084fc',
    pattern: 'geometric',
    shape: 'circle'
  },
  'blue-wave': {
    id: 'blue-wave',
    name: 'Ola Azul',
    backgroundColor: '#3b82f6',
    accentColor: '#60a5fa',
    pattern: 'abstract',
    shape: 'circle'
  },
  'red-fire': {
    id: 'red-fire',
    name: 'Fuego Rojo',
    backgroundColor: '#ef4444',
    accentColor: '#fca5a5',
    pattern: 'geometric',
    shape: 'circle'
  },
  'green-nature': {
    id: 'green-nature',
    name: 'Verde Naturaleza',
    backgroundColor: '#10b981',
    accentColor: '#6ee7b7',
    pattern: 'minimal',
    shape: 'circle'
  },
  'orange-sun': {
    id: 'orange-sun',
    name: 'Sol Naranja',
    backgroundColor: '#f59e0b',
    accentColor: '#fcd34d',
    pattern: 'geometric',
    shape: 'circle'
  },
  'pink-candy': {
    id: 'pink-candy',
    name: 'Dulce Rosa',
    backgroundColor: '#ec4899',
    accentColor: '#fbcfe8',
    pattern: 'abstract',
    shape: 'circle'
  },
  'teal-ocean': {
    id: 'teal-ocean',
    name: 'Océano Turquesa',
    backgroundColor: '#14b8a6',
    accentColor: '#5eead4',
    pattern: 'abstract',
    shape: 'circle'
  },
  'indigo-night': {
    id: 'indigo-night',
    name: 'Noche Índigo',
    backgroundColor: '#6366f1',
    accentColor: '#a5b4fc',
    pattern: 'minimal',
    shape: 'circle'
  },
  'yellow-star': {
    id: 'yellow-star',
    name: 'Estrella Amarilla',
    backgroundColor: '#eab308',
    accentColor: '#fef08a',
    pattern: 'geometric',
    shape: 'circle'
  },
  'cyan-ice': {
    id: 'cyan-ice',
    name: 'Hielo Cian',
    backgroundColor: '#06b6d4',
    accentColor: '#a5f3fc',
    pattern: 'minimal',
    shape: 'circle'
  },
  'rose-garden': {
    id: 'rose-garden',
    name: 'Jardín Rosa',
    backgroundColor: '#f43f5e',
    accentColor: '#fecdd3',
    pattern: 'abstract',
    shape: 'circle'
  },
  'lime-fresh': {
    id: 'lime-fresh',
    name: 'Lima Fresca',
    backgroundColor: '#84cc16',
    accentColor: '#d9f99d',
    pattern: 'geometric',
    shape: 'circle'
  },
  'violet-magic': {
    id: 'violet-magic',
    name: 'Magia Violeta',
    backgroundColor: '#8b5cf6',
    accentColor: '#ddd6fe',
    pattern: 'abstract',
    shape: 'circle'
  },
  'amber-gold': {
    id: 'amber-gold',
    name: 'Oro Ámbar',
    backgroundColor: '#f59e0b',
    accentColor: '#fde68a',
    pattern: 'geometric',
    shape: 'circle'
  },
  'emerald-forest': {
    id: 'emerald-forest',
    name: 'Bosque Esmeralda',
    backgroundColor: '#059669',
    accentColor: '#a7f3d0',
    pattern: 'minimal',
    shape: 'circle'
  },
  'sky-dream': {
    id: 'sky-dream',
    name: 'Sueño Celeste',
    backgroundColor: '#0ea5e9',
    accentColor: '#bae6fd',
    pattern: 'abstract',
    shape: 'circle'
  },
  'fuchsia-pop': {
    id: 'fuchsia-pop',
    name: 'Pop Fucsia',
    backgroundColor: '#d946ef',
    accentColor: '#f5d0fe',
    pattern: 'geometric',
    shape: 'circle'
  },
  'slate-modern': {
    id: 'slate-modern',
    name: 'Moderno Pizarra',
    backgroundColor: '#475569',
    accentColor: '#cbd5e1',
    pattern: 'minimal',
    shape: 'circle'
  },
  'red-passion': {
    id: 'red-passion',
    name: 'Pasión Roja',
    backgroundColor: '#dc2626',
    accentColor: '#fecaca',
    pattern: 'abstract',
    shape: 'circle'
  },
  'blue-electric': {
    id: 'blue-electric',
    name: 'Eléctrico Azul',
    backgroundColor: '#2563eb',
    accentColor: '#93c5fd',
    pattern: 'geometric',
    shape: 'circle'
  },
  'green-mint': {
    id: 'green-mint',
    name: 'Menta Verde',
    backgroundColor: '#22c55e',
    accentColor: '#bbf7d0',
    pattern: 'minimal',
    shape: 'circle'
  },
  'orange-blaze': {
    id: 'orange-blaze',
    name: 'Llama Naranja',
    backgroundColor: '#ea580c',
    accentColor: '#fed7aa',
    pattern: 'abstract',
    shape: 'circle'
  },
  'purple-royal': {
    id: 'purple-royal',
    name: 'Púrpura Real',
    backgroundColor: '#7c3aed',
    accentColor: '#e9d5ff',
    pattern: 'geometric',
    shape: 'circle'
  },
  'pink-blossom': {
    id: 'pink-blossom',
    name: 'Flor Rosa',
    backgroundColor: '#f472b6',
    accentColor: '#fbcfe8',
    pattern: 'minimal',
    shape: 'circle'
  },
  'teal-tropical': {
    id: 'teal-tropical',
    name: 'Tropical Turquesa',
    backgroundColor: '#0d9488',
    accentColor: '#99f6e4',
    pattern: 'abstract',
    shape: 'circle'
  },
  'yellow-sunshine': {
    id: 'yellow-sunshine',
    name: 'Sol Brillante',
    backgroundColor: '#facc15',
    accentColor: '#fef9c3',
    pattern: 'geometric',
    shape: 'circle'
  },
  'indigo-deep': {
    id: 'indigo-deep',
    name: 'Índigo Profundo',
    backgroundColor: '#4f46e5',
    accentColor: '#c7d2fe',
    pattern: 'minimal',
    shape: 'circle'
  },
  'rose-sunset': {
    id: 'rose-sunset',
    name: 'Atardecer Rosa',
    backgroundColor: '#fb7185',
    accentColor: '#fecdd3',
    pattern: 'abstract',
    shape: 'circle'
  },
  'cyan-aqua': {
    id: 'cyan-aqua',
    name: 'Agua Cian',
    backgroundColor: '#22d3ee',
    accentColor: '#cffafe',
    pattern: 'geometric',
    shape: 'circle'
  },
  'lime-energy': {
    id: 'lime-energy',
    name: 'Energía Lima',
    backgroundColor: '#a3e635',
    accentColor: '#ecfccb',
    pattern: 'minimal',
    shape: 'circle'
  },
  'violet-dream': {
    id: 'violet-dream',
    name: 'Sueño Violeta',
    backgroundColor: '#a78bfa',
    accentColor: '#ede9fe',
    pattern: 'abstract',
    shape: 'circle'
  },
  'amber-warm': {
    id: 'amber-warm',
    name: 'Cálido Ámbar',
    backgroundColor: '#fb923c',
    accentColor: '#ffedd5',
    pattern: 'geometric',
    shape: 'circle'
  }
}

const PlayerAvatar: React.FC<PlayerAvatarProps> = ({ 
  avatar, 
  size = 'md',
  className = '' 
}) => {
  const config = AVATAR_CONFIGS[avatar] || AVATAR_CONFIGS['purple-geo']
  
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24'
  }

  const renderPattern = () => {
    switch (config.pattern) {
      case 'geometric':
        return (
          <svg width="100%" height="100%" viewBox="0 0 100 100">
            <defs>
              <linearGradient id={`grad-${avatar}`} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style={{ stopColor: config.backgroundColor, stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: config.accentColor, stopOpacity: 1 }} />
              </linearGradient>
            </defs>
            <circle cx="50" cy="50" r="50" fill={`url(#grad-${avatar})`} />
            <circle cx="50" cy="35" r="12" fill="white" opacity="0.9" />
            <circle cx="35" cy="55" r="8" fill="white" opacity="0.7" />
            <circle cx="65" cy="55" r="8" fill="white" opacity="0.7" />
            <path d="M 30 70 Q 50 85 70 70" stroke="white" strokeWidth="4" fill="none" opacity="0.8" strokeLinecap="round" />
          </svg>
        )
      
      case 'abstract':
        return (
          <svg width="100%" height="100%" viewBox="0 0 100 100">
            <defs>
              <radialGradient id={`radial-${avatar}`}>
                <stop offset="0%" style={{ stopColor: config.accentColor, stopOpacity: 1 }} />
                <stop offset="100%" style={{ stopColor: config.backgroundColor, stopOpacity: 1 }} />
              </radialGradient>
            </defs>
            <circle cx="50" cy="50" r="50" fill={`url(#radial-${avatar})`} />
            <ellipse cx="40" cy="40" rx="15" ry="20" fill="white" opacity="0.3" transform="rotate(-20 40 40)" />
            <ellipse cx="65" cy="55" rx="12" ry="18" fill="white" opacity="0.25" transform="rotate(30 65 55)" />
            <circle cx="50" cy="70" r="8" fill="white" opacity="0.4" />
          </svg>
        )
      
      case 'minimal':
        return (
          <svg width="100%" height="100%" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="50" fill={config.backgroundColor} />
            <circle cx="35" cy="40" r="6" fill="white" opacity="0.9" />
            <circle cx="65" cy="40" r="6" fill="white" opacity="0.9" />
            <circle cx="50" cy="65" r="15" fill={config.accentColor} opacity="0.6" />
          </svg>
        )
      
      default:
        return (
          <svg width="100%" height="100%" viewBox="0 0 100 100">
            <circle cx="50" cy="50" r="50" fill={config.backgroundColor} />
          </svg>
        )
    }
  }

  return (
    <div 
      className={`${sizeClasses[size]} ${className} rounded-full overflow-hidden shadow-md hover:shadow-lg transition-shadow`}
      style={{ flexShrink: 0 }}
      title={config.name}
    >
      {renderPattern()}
    </div>
  )
}

export default PlayerAvatar

export { AVATAR_CONFIGS }
