import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";

function useMediaQuery(query: string) {
  const [matches, setMatches] = React.useState(false);

  React.useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener?.("change", onChange);
    return () => mql.removeEventListener?.("change", onChange);
  }, [query]);

  return matches;
}

export function CustomCursor() {
  const prefersReducedMotion = useReducedMotion();
  const isFinePointer = useMediaQuery("(pointer: fine)");

  const [cursor, setCursor] = React.useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = React.useState(false);

  React.useEffect(() => {
    if (prefersReducedMotion || !isFinePointer) return;

    let raf = 0;
    const handler = (e: MouseEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => setCursor({ x: e.clientX, y: e.clientY }));
    };
    window.addEventListener("mousemove", handler, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", handler);
    };
  }, [isFinePointer, prefersReducedMotion]);

  React.useEffect(() => {
    if (prefersReducedMotion || !isFinePointer) return;

    const enter = () => setIsHovering(true);
    const leave = () => setIsHovering(false);

    const targets = Array.from(
      document.querySelectorAll<HTMLElement>(
        "a,button,[role='button'],[data-cursor='hover']",
      ),
    );

    targets.forEach((el) => {
      el.addEventListener("mouseenter", enter);
      el.addEventListener("mouseleave", leave);
    });

    return () => {
      targets.forEach((el) => {
        el.removeEventListener("mouseenter", enter);
        el.removeEventListener("mouseleave", leave);
      });
    };
  }, [isFinePointer, prefersReducedMotion]);

  if (prefersReducedMotion || !isFinePointer) return null;

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[9999]"
      animate={{
        x: cursor.x - 10,
        y: cursor.y - 10,
        scale: isHovering ? 2 : 1,
      }}
      transition={{ type: "spring", stiffness: 500, damping: 40, mass: 0.2 }}
      style={{
        width: 20,
        height: 20,
        borderRadius: 9999,
        borderWidth: 2,
        borderStyle: "solid",
        borderColor: "hsl(var(--brand-primary-light))",
        mixBlendMode: "difference",
      }}
    />
  );
}
