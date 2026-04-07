'use client'

/**
 * PageLoader — full-area overlay shown during view transitions.
 * Uses the ClueZero icon mark with a breathing animation.
 * Mounts/unmounts cleanly with CSS transitions so there's no flash.
 */

import { ClueZeroMark } from '@/components/brand/logo'

interface Props {
  visible: boolean
}

export function PageLoader({ visible }: Props) {
  return (
    <div
      aria-hidden="true"
      style={{
        position:        'fixed',
        inset:           0,
        zIndex:          200,
        display:         'flex',
        alignItems:      'center',
        justifyContent:  'center',
        background:      'rgba(250,250,252,0.88)',
        backdropFilter:  'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        pointerEvents:   visible ? 'all' : 'none',
        opacity:         visible ? 1 : 0,
        transition:      'opacity 200ms ease',
      }}
    >
      <div
        style={{
          display:   'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap:        16,
          transform:  visible ? 'scale(1)' : 'scale(0.92)',
          opacity:    visible ? 1 : 0,
          transition: 'transform 300ms cubic-bezier(0.34,1.56,0.64,1), opacity 200ms ease',
        }}
      >
        {/* Icon with breathing pulse */}
        <div style={{ animation: 'cz-breathe 1.4s ease-in-out infinite' }}>
          <ClueZeroMark size={48} color="#18181b" />
        </div>

        {/* Three-dot progress indicator */}
        <div style={{ display: 'flex', gap: 6 }}>
          {[0, 1, 2].map(i => (
            <div
              key={i}
              style={{
                width:            6,
                height:           6,
                borderRadius:     '50%',
                background:       '#18181b',
                animation:        `cz-dot 1s ease-in-out ${i * 160}ms infinite`,
              }}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes cz-breathe {
          0%, 100% { transform: scale(1);    opacity: 1;    }
          50%       { transform: scale(1.08); opacity: 0.72; }
        }
        @keyframes cz-dot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.3; }
          40%            { transform: scale(1);   opacity: 1;   }
        }
      `}</style>
    </div>
  )
}
