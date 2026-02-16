import * as React from "react";
import { motion } from "framer-motion";

export function PageFadeIn({ children }: { children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      {children}
    </motion.div>
  );
}
