import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Blocks, QrCode, Rocket } from "lucide-react";

import { useInView } from "@/hooks/use-in-view";
import { cn } from "@/lib/utils";

type TimelineStepData = {
  title: string;
  description: string;
  Icon: LucideIcon;
};

function TimelineStep({ step, index, isLeft }: { step: TimelineStepData; index: number; isLeft: boolean }) {
  const prefersReducedMotion = useReducedMotion();
  const { ref, inView } = useInView<HTMLDivElement>({ threshold: 0.3, triggerOnce: true });

  return (
    <motion.div
      ref={ref}
      className={cn(
        "relative mb-16 flex items-center md:mb-24",
        "flex-col gap-8 md:gap-0",
        isLeft ? "md:flex-row" : "md:flex-row-reverse",
      )}
      initial={prefersReducedMotion ? undefined : { opacity: 0, x: isLeft ? -100 : 100 }}
      animate={prefersReducedMotion ? undefined : inView ? { opacity: 1, x: 0 } : { opacity: 0, x: isLeft ? -100 : 100 }}
      transition={prefersReducedMotion ? undefined : { duration: 0.8, delay: index * 0.2, ease: "easeOut" }}
    >
      {/* Content card */}
      <motion.div
        className={cn(
          "w-full md:w-5/12",
          isLeft ? "md:text-right md:pr-16" : "md:text-left md:pl-16",
        )}
        whileHover={prefersReducedMotion ? undefined : { scale: 1.03 }}
        transition={{ duration: 0.25 }}
      >
        <motion.div
          className="hero-glass border-background/20 p-8"
          whileHover={
            prefersReducedMotion
              ? undefined
              : {
                  boxShadow: "0 20px 60px hsl(var(--brand-primary-light) / 0.20)",
                }
          }
        >
          <motion.div
            className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-r from-brand-primary-deep to-brand-primary-light text-primary-foreground"
            initial={prefersReducedMotion ? undefined : { scale: 0 }}
            animate={prefersReducedMotion ? undefined : inView ? { scale: 1 } : { scale: 0 }}
            transition={
              prefersReducedMotion
                ? undefined
                : { duration: 0.5, delay: index * 0.2 + 0.3, type: "spring", stiffness: 200 }
            }
          >
            <span className="text-xl font-bold">{index + 1}</span>
          </motion.div>

          <motion.div
            initial={prefersReducedMotion ? undefined : { rotate: -180, opacity: 0 }}
            animate={prefersReducedMotion ? undefined : inView ? { rotate: 0, opacity: 1 } : { rotate: -180, opacity: 0 }}
            transition={prefersReducedMotion ? undefined : { duration: 0.6, delay: index * 0.2 + 0.4 }}
            className={cn("mb-4 inline-flex", isLeft ? "md:justify-end" : "md:justify-start")}
          >
            <step.Icon className="h-8 w-8 text-foreground" />
          </motion.div>

          <h3 className="text-2xl font-bold text-foreground">{step.title}</h3>
          <p className="mt-3 text-muted-foreground">{step.description}</p>
        </motion.div>
      </motion.div>

      {/* Center point (desktop) */}
      <motion.div
        className="absolute left-1/2 hidden h-6 w-6 -translate-x-1/2 rounded-full border-4 border-brand-primary-light bg-background md:block"
        initial={prefersReducedMotion ? undefined : { scale: 0 }}
        animate={prefersReducedMotion ? undefined : inView ? { scale: 1 } : { scale: 0 }}
        transition={
          prefersReducedMotion
            ? undefined
            : { duration: 0.4, delay: index * 0.2 + 0.5, type: "spring", stiffness: 220 }
        }
        whileHover={prefersReducedMotion ? undefined : { scale: 1.5 }}
      >
        <motion.div
          className="absolute inset-0 rounded-full bg-brand-primary-light"
          initial={prefersReducedMotion ? undefined : { scale: 1, opacity: 0.7 }}
          animate={
            prefersReducedMotion
              ? undefined
              : {
                  scale: [1, 1.5, 1],
                  opacity: [0.7, 0, 0.7],
                }
          }
          transition={prefersReducedMotion ? undefined : { duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>

      {/* Dashed connector arrow (desktop) */}
      <motion.svg
        aria-hidden
        className={cn(
          "pointer-events-none absolute top-1/2 hidden h-24 w-24 -translate-y-1/2 md:block",
          isLeft ? "left-1/2" : "right-1/2",
        )}
        viewBox="0 0 100 100"
        initial={prefersReducedMotion ? undefined : { pathLength: 0, opacity: 0 }}
        animate={prefersReducedMotion ? undefined : inView ? { pathLength: 1, opacity: 1 } : { pathLength: 0, opacity: 0 }}
        transition={prefersReducedMotion ? undefined : { duration: 1, delay: index * 0.2 + 0.7 }}
        style={{
          transform: isLeft ? "translate(0, -50%)" : "translate(0, -50%) scaleX(-1)",
        }}
      >
        <motion.path
          d="M10,50 C35,50 45,25 70,25"
          stroke="hsl(var(--brand-primary-light))"
          strokeWidth="2"
          fill="none"
          strokeDasharray="5,5"
        />
      </motion.svg>

      {/* Illustration side (desktop) / stacked (mobile) */}
      <motion.div
        className="w-full md:w-5/12"
        initial={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.8 }}
        animate={prefersReducedMotion ? undefined : inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
        transition={prefersReducedMotion ? undefined : { duration: 0.6, delay: index * 0.2 + 0.6 }}
      >
        <div className="hero-glass border-background/10 p-6">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-foreground">Preview</p>
            <span className="text-xs text-muted-foreground">Etapa {index + 1}</span>
          </div>
          <div className="mt-4 rounded-xl border border-background/10 bg-background/10 p-5">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-background/10">
                <step.Icon className="h-5 w-5 text-foreground" />
              </div>
              <div className="leading-tight">
                <p className="text-sm font-medium text-foreground">{step.title}</p>
                <p className="text-xs text-muted-foreground">Automação em andamento</p>
              </div>
            </div>
            <div className="mt-4 grid gap-2">
              <div className="h-2 w-3/5 rounded-full bg-muted/80" />
              <div className="h-2 w-4/5 rounded-full bg-muted/60" />
              <div className="h-2 w-2/5 rounded-full bg-muted/60" />
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export function HowItWorksTimeline() {
  const prefersReducedMotion = useReducedMotion();
  const { ref, inView } = useInView<HTMLElement>({ threshold: 0.2, triggerOnce: true });

  const steps: TimelineStepData[] = React.useMemo(
    () => [
      {
        title: "Conecte seu WhatsApp",
        description: "Escaneie o QR Code e conecte seu número oficial em 2 minutos.",
        Icon: QrCode,
      },
      {
        title: "Configure ZapFllow",
        description: "Use templates prontos ou crie fluxos personalizados com arrastar e soltar.",
        Icon: Blocks,
      },
      {
        title: "Venda no Automático",
        description: "Seu bot trabalha 24/7 vendendo, agendando e atendendo clientes.",
        Icon: Rocket,
      },
    ],
    [],
  );

  return (
    <section
      id="como-funciona"
      ref={ref}
      className="relative overflow-hidden border-t bg-gradient-to-b from-background via-background to-muted/30 py-24 md:py-32"
    >
      {/* Animated vertical line (desktop center) */}
      <motion.div
        aria-hidden
        className="absolute left-1/2 top-0 hidden h-full w-1 -translate-x-1/2 bg-gradient-to-b from-brand-primary-light/0 via-brand-primary-light to-brand-primary-light/0 md:block"
        initial={prefersReducedMotion ? undefined : { scaleY: 0 }}
        whileInView={prefersReducedMotion ? undefined : { scaleY: 1 }}
        transition={prefersReducedMotion ? undefined : { duration: 1.5, ease: "easeInOut" }}
        viewport={{ once: true }}
        style={{ transformOrigin: "top" }}
      />

      {/* Mobile line (left) */}
      <motion.div
        aria-hidden
        className="absolute left-6 top-0 h-full w-px bg-gradient-to-b from-brand-primary-light/0 via-brand-primary-light/70 to-brand-primary-light/0 md:hidden"
        initial={prefersReducedMotion ? undefined : { scaleY: 0 }}
        whileInView={prefersReducedMotion ? undefined : { scaleY: 1 }}
        transition={prefersReducedMotion ? undefined : { duration: 1.2, ease: "easeInOut" }}
        viewport={{ once: true }}
        style={{ transformOrigin: "top" }}
      />

      <div className="mx-auto max-w-7xl px-4">
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight">Comece em 3 Passos Simples</h2>
          <p className="mt-2 text-muted-foreground">Do zero ao primeiro bot rodando em poucos minutos.</p>
        </div>

        {/* Mobile steps (no zigzag) */}
        <div className="grid gap-10 md:hidden">
          {steps.map((step, index) => (
            <motion.div
              key={step.title}
              className="relative pl-12"
              initial={prefersReducedMotion ? undefined : { opacity: 0, y: 24 }}
              whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
              transition={prefersReducedMotion ? undefined : { duration: 0.6, delay: index * 0.15 }}
              viewport={{ once: true, amount: 0.3 }}
            >
              <motion.div
                className="absolute left-6 top-3 h-5 w-5 -translate-x-1/2 rounded-full border-4 border-brand-primary-light bg-background"
                initial={prefersReducedMotion ? undefined : { scale: 0 }}
                whileInView={prefersReducedMotion ? undefined : { scale: 1 }}
                transition={prefersReducedMotion ? undefined : { duration: 0.35, type: "spring", stiffness: 220 }}
                viewport={{ once: true, amount: 0.3 }}
              />
              <div className="hero-glass border-background/15 p-6">
                <div className="flex items-start justify-between">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-background/10 text-foreground">
                    <step.Icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs text-muted-foreground">Etapa {index + 1}</span>
                </div>
                <h3 className="mt-4 text-xl font-bold text-foreground">{step.title}</h3>
                <p className="mt-2 text-muted-foreground">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Desktop zigzag timeline */}
        <div className="relative hidden md:block">
          {steps.map((step, index) => (
            <TimelineStep key={step.title} step={step} index={index} isLeft={index % 2 === 0} />
          ))}
        </div>
      </div>
    </section>
  );
}
