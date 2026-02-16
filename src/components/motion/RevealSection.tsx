import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useInView } from "@/hooks/use-in-view";
import { cn } from "@/lib/utils";

type RevealSectionProps = {
  id?: string;
  className?: string;
  threshold?: number;
  children: React.ReactNode;
};

export function RevealSection({ id, className, threshold = 0.2, children }: RevealSectionProps) {
  const prefersReducedMotion = useReducedMotion();
  const { ref, inView } = useInView<HTMLElement>({ threshold, triggerOnce: true });

  return (
    <motion.section
      ref={ref}
      id={id}
      className={cn(className)}
      initial={prefersReducedMotion ? undefined : { opacity: 0, y: 50 }}
      animate={
        prefersReducedMotion ? undefined : inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 50 }
      }
      transition={prefersReducedMotion ? undefined : { duration: 0.6, ease: "easeOut" }}
    >
      {children}
    </motion.section>
  );
}
