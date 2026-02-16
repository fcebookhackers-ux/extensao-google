import * as React from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

type FeatureCardProps = {
  Icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
};

export function FeatureCard({ Icon, title, description, className }: FeatureCardProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <motion.div
      className={cn("relative group", className)}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={{ y: -10 }}
      transition={{ duration: 0.3 }}
    >
      {/* Expanding glow */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-2xl blur-xl"
        style={{
          backgroundImage:
            "linear-gradient(90deg, hsl(var(--brand-primary)), hsl(var(--brand-primary-light)))",
        }}
        animate={{ opacity: isHovered ? 0.3 : 0, scale: isHovered ? 1.05 : 1 }}
        transition={{ duration: 0.3 }}
      />

      {/* Main card */}
      <motion.div
        className="relative overflow-hidden rounded-2xl border bg-card p-8 shadow-lg"
        whileHover={{
          borderColor: "hsl(var(--brand-primary-light))",
          boxShadow: "0 20px 60px hsl(var(--brand-primary-light) / 0.20)",
        }}
        transition={{ duration: 0.3 }}
      >
        {/* Shine */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-0"
          style={{
            backgroundImage:
              "linear-gradient(90deg, transparent, hsl(var(--background) / 0.55), transparent)",
          }}
          animate={{
            x: isHovered ? ["-60%", "160%"] : "-60%",
            opacity: isHovered ? [0, 0.35, 0] : 0,
          }}
          transition={{ duration: 0.8 }}
        />

        {/* Icon + particles */}
        <motion.div
          className="relative mb-6 inline-flex"
          animate={{ rotate: isHovered ? [0, -10, 10, 0] : 0, scale: isHovered ? 1.1 : 1 }}
          transition={{ duration: 0.5 }}
        >
          <motion.div
            aria-hidden
            className="absolute inset-0 rounded-xl bg-primary/10"
            animate={{ scale: isHovered ? [1, 1.2, 1] : 1 }}
            transition={{ duration: 0.5 }}
          />

          <div className="relative rounded-xl bg-gradient-to-br from-primary/20 to-transparent p-4">
            <Icon size={32} className="text-primary" />
          </div>

          {isHovered && (
            <>
              {Array.from({ length: 6 }).map((_, i) => (
                <motion.div
                  key={i}
                  aria-hidden
                  className="absolute h-2 w-2 rounded-full bg-primary"
                  initial={{ x: 0, y: 0, opacity: 1 }}
                  animate={{
                    x: Math.cos((i * Math.PI * 2) / 6) * 40,
                    y: Math.sin((i * Math.PI * 2) / 6) * 40,
                    opacity: 0,
                  }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              ))}
            </>
          )}
        </motion.div>

        <motion.h3
          className={cn(
            "mb-3 text-xl font-bold transition-colors",
            isHovered
              ? "bg-gradient-to-r from-brand-primary-deep to-brand-primary-light bg-clip-text text-transparent"
              : "text-foreground",
          )}
        >
          {title}
        </motion.h3>

        <motion.p
          className="overflow-hidden text-muted-foreground"
          layout
          animate={{ height: isHovered ? "auto" : "3.6rem" }}
          transition={{ duration: 0.25 }}
        >
          {description}
        </motion.p>

        <motion.button
          type="button"
          data-cursor="hover"
          className="mt-4 inline-flex items-center gap-2 text-primary font-semibold"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 10 }}
          transition={{ duration: 0.3 }}
        >
          Saiba mais
          <motion.span animate={{ x: isHovered ? 5 : 0 }} transition={{ duration: 0.3 }}>
            →
          </motion.span>
        </motion.button>
      </motion.div>
    </motion.div>
  );
}
