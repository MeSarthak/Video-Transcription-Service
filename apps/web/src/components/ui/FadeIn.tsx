/**
 * FadeIn — wraps any content in a simple opacity+y entrance animation.
 * Respects prefers-reduced-motion automatically.
 */
import { motion, useReducedMotion } from "framer-motion";

interface FadeInProps {
  children: React.ReactNode;
  /** Vertical offset to start from (px). Default 12. */
  y?: number;
  /** Duration in seconds. Default 0.25. */
  duration?: number;
  /** Delay in seconds. Default 0. */
  delay?: number;
  className?: string;
}

export function FadeIn({ children, y = 12, duration = 0.25, delay = 0, className }: FadeInProps) {
  const reduced = useReducedMotion();

  return (
    <motion.div
      initial={{ opacity: 0, y: reduced ? 0 : y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduced ? 0 : duration, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
