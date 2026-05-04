'use client'

import { ReactNode } from 'react'
import { motion } from 'motion/react'

interface ViewTransitionProps {
  children: ReactNode
  className?: string
}

/**
 * Wraps a dashboard view with a smooth fade-slide entrance animation.
 * Applied at the top level of each view for consistent transitions.
 */
export function ViewTransition({ children, className }: ViewTransitionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
