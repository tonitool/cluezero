'use client'

import { ReactNode } from 'react'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'

interface StaggerGroupProps {
  children: ReactNode
  className?: string
  /** Delay in seconds between each child animation */
  stagger?: number
  /** Base delay before the first child starts */
  delay?: number
}

/**
 * Wraps children in a staggered fade-in animation container.
 * Children animate sequentially with a configurable stagger interval.
 */
export function StaggerGroup({ children, className, stagger = 0.06, delay = 0 }: StaggerGroupProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: stagger,
            delayChildren: delay,
          },
        },
      }}
      className={cn(className)}
    >
      {children}
    </motion.div>
  )
}

/** Wrap individual items inside StaggerGroup */
export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 14 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
