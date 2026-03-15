/**
 * StaggerList — animates children in with staggered entrance.
 * Use as the grid/list container; wrap each child in StaggerItem.
 * Respects prefers-reduced-motion automatically.
 */
import { motion, useReducedMotion } from "framer-motion";

interface StaggerListProps {
  children: React.ReactNode;
  className?: string;
  /** Delay between each child (seconds). Default 0.04. */
  stagger?: number;
}

interface StaggerItemProps {
  children: React.ReactNode;
  className?: string;
}

export function StaggerList({ children, className, stagger = 0.04 }: StaggerListProps) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: reduced ? 0 : stagger,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: StaggerItemProps) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: reduced ? 0 : 16 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.25, ease: "easeOut" },
        },
      }}
    >
      {children}
    </motion.div>
  );
}
