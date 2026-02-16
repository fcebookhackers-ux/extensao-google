import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Link } from "react-router-dom";
import { Shield, Star } from "lucide-react";

import { cn } from "@/lib/utils";
import { WHATSAPP_LINK } from "@/lib/links";

type FinalEpicCtaProps = {
  ctaTo: string;
  className?: string;
};

type Particle = {
  left: string;
  top: string;
  duration: number;
  delay: number;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function useFakeCountdown() {
  // UI-only (no business logic): keeps the section feeling alive.
  const prefersReducedMotion = useReducedMotion();
  const [now, setNow] = React.useState(() => Date.now());

  React.useEffect(() => {
    if (prefersReducedMotion) return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [prefersReducedMotion]);

  // “Offer ends in” — rolling clock feel.
  const base = React.useMemo(() => {
    const d = new Date();
    // Use a stable “deadline” within the next ~3 days (not tied to backend).
    d.setHours(d.getHours() + 84);
    return d.getTime();
  }, []);

  const diff = Math.max(0, base - now);
  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    days: pad2(Math.min(days, 99)),
    hours: pad2(hours),
    minutes: pad2(minutes),
    seconds: pad2(seconds),
  };
}

function CountdownTile({ label, value }: { label: string; value: string }) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="min-w-[92px] rounded-2xl border border-background/15 bg-background/10 p-5 backdrop-blur-md">
      <motion.div
        className="mb-2 text-4xl font-black text-background sm:text-5xl"
        animate={prefersReducedMotion ? undefined : { scale: [1, 1.08, 1] }}
        transition={prefersReducedMotion ? undefined : { duration: 1, repeat: Infinity, ease: "easeInOut" }}
      >
        {value}
      </motion.div>
      <div className="text-xs font-semibold uppercase tracking-wider text-background/70">{label}</div>
    </div>
  );
}

export function FinalEpicCta({ ctaTo, className }: FinalEpicCtaProps) {
  const prefersReducedMotion = useReducedMotion();
  const countdown = useFakeCountdown();

  const particles = React.useMemo<Particle[]>(
    () =>
      Array.from({ length: 20 }).map(() => ({
        left: `${Math.round(Math.random() * 100)}%`,
        top: `${Math.round(Math.random() * 100)}%`,
        duration: 3 + Math.random() * 2,
        delay: Math.random() * 2,
      })),
    [],
  );

  return (
    <section className={cn("relative overflow-hidden py-28 sm:py-32", className)}>
      {/* Background */}
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(135deg, hsl(var(--brand-primary)), hsl(var(--brand-primary-light)), hsl(var(--brand-primary-mid)))",
        }}
      />

      {/* Animated dot pattern */}
      <motion.div
        aria-hidden
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: "radial-gradient(circle at 20% 50%, hsl(var(--background)) 1px, transparent 1px)",
          backgroundSize: "50px 50px",
        }}
        animate={prefersReducedMotion ? undefined : { backgroundPosition: ["0px 0px", "50px 50px"] }}
        transition={prefersReducedMotion ? undefined : { duration: 20, repeat: Infinity, ease: "linear" }}
      />

      {/* Floating particles */}
      {!prefersReducedMotion &&
        particles.map((p, i) => (
          <motion.div
            key={i}
            aria-hidden
            className="absolute h-2 w-2 rounded-full bg-background"
            style={{ left: p.left, top: p.top }}
            animate={{ y: [0, -30, 0], opacity: [0, 1, 0] }}
            transition={{ duration: p.duration, repeat: Infinity, delay: p.delay, ease: "easeInOut" }}
          />
        ))}

      <div className="relative z-10 mx-auto max-w-7xl px-4">
        <motion.div
          className="mx-auto max-w-4xl text-center"
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 50 }}
          whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-120px" }}
          transition={prefersReducedMotion ? undefined : { duration: 0.7, ease: "easeOut" }}
        >
          {/* Pulsing badge */}
          <motion.div
            className="mb-8 inline-flex items-center gap-2 rounded-full border border-background/20 bg-background/10 px-6 py-3 font-semibold text-background backdrop-blur-sm"
            animate={
              prefersReducedMotion
                ? undefined
                : {
                    scale: [1, 1.05, 1],
                    boxShadow: [
                      "0 0 0 0 hsl(var(--background) / 0.70)",
                      "0 0 0 12px hsl(var(--background) / 0)",
                    ],
                  }
            }
            transition={prefersReducedMotion ? undefined : { duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            Oferta por Tempo Limitado
          </motion.div>

          {/* Headline */}
          <motion.h2
            className="mb-6 text-balance text-5xl font-black leading-tight tracking-tight text-background sm:text-6xl md:text-7xl"
            initial={prefersReducedMotion ? undefined : { opacity: 0, y: 30 }}
            whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={prefersReducedMotion ? undefined : { delay: 0.2, duration: 0.6, ease: "easeOut" }}
          >
            Pronto para Automatizar
            <br />
            <span className="inline-block -rotate-1 bg-background px-4 text-brand-primary-deep">
              Seu WhatsApp?
            </span>
          </motion.h2>

          {/* Subheadline */}
          <motion.p
            className="mb-12 text-xl text-background/90 sm:text-2xl"
            initial={prefersReducedMotion ? undefined : { opacity: 0 }}
            whileInView={prefersReducedMotion ? undefined : { opacity: 1 }}
            viewport={{ once: true, amount: 0.7 }}
            transition={prefersReducedMotion ? undefined : { delay: 0.4, duration: 0.6 }}
          >
            Junte-se a 500+ empresas que já vendem no automático
          </motion.p>

          {/* Countdown */}
          <motion.div
            className="mb-12 flex flex-wrap justify-center gap-4"
            initial={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.92 }}
            whileInView={prefersReducedMotion ? undefined : { opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={prefersReducedMotion ? undefined : { delay: 0.6, duration: 0.6, ease: "easeOut" }}
          >
            <CountdownTile label="Dias" value={countdown.days} />
            <CountdownTile label="Horas" value={countdown.hours} />
            <CountdownTile label="Minutos" value={countdown.minutes} />
            <CountdownTile label="Segundos" value={countdown.seconds} />
          </motion.div>

          {/* CTAs */}
          <motion.div
            className="flex flex-col items-center justify-center gap-4 sm:flex-row"
            initial={prefersReducedMotion ? undefined : { opacity: 0, y: 30 }}
            whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.7 }}
            transition={prefersReducedMotion ? undefined : { delay: 0.8, duration: 0.6, ease: "easeOut" }}
          >
            <motion.div whileHover={prefersReducedMotion ? undefined : { scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Link
                to={ctaTo}
                className={cn(
                  "group relative inline-flex items-center justify-center overflow-hidden rounded-2xl",
                  "bg-background px-10 py-5 text-lg font-bold text-brand-primary-deep shadow-2xl",
                )}
              >
                <motion.div
                  aria-hidden
                  className="absolute inset-0"
                  style={{
                    backgroundImage:
                      "linear-gradient(90deg, transparent, hsl(var(--background) / 0.35), transparent)",
                  }}
                  initial={{ x: "-100%" }}
                  whileHover={prefersReducedMotion ? undefined : { x: "200%" }}
                  transition={{ duration: 0.6 }}
                />
                <span className="relative z-10 flex items-center gap-3">
                  Começar Grátis Agora
                  <motion.span
                    aria-hidden
                    animate={prefersReducedMotion ? undefined : { x: [0, 6, 0] }}
                    transition={prefersReducedMotion ? undefined : { duration: 1, repeat: Infinity, ease: "easeInOut" }}
                  >
                    →
                  </motion.span>
                </span>
              </Link>
            </motion.div>

            <motion.a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noreferrer"
              className={cn(
                "inline-flex items-center justify-center rounded-2xl border-2",
                "border-background/80 px-8 py-5 text-base font-bold text-background",
                "transition-colors hover:bg-background hover:text-brand-primary-deep",
              )}
              whileHover={prefersReducedMotion ? undefined : { scale: 1.05 }}
              whileTap={prefersReducedMotion ? undefined : { scale: 0.95 }}
            >
              Falar com vendas
            </motion.a>
          </motion.div>

          {/* Social proof */}
          <motion.div
            className="mt-12 flex flex-wrap items-center justify-center gap-8"
            initial={prefersReducedMotion ? undefined : { opacity: 0 }}
            whileInView={prefersReducedMotion ? undefined : { opacity: 1 }}
            viewport={{ once: true, amount: 0.7 }}
            transition={prefersReducedMotion ? undefined : { delay: 1, duration: 0.6 }}
          >
            <div className="flex items-center gap-3 text-background">
              <div className="flex -space-x-2" aria-hidden>
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="h-10 w-10 rounded-full border-2 border-background/90 bg-background/15"
                  />
                ))}
              </div>
              <span className="font-semibold">+500 empresas</span>
            </div>

            <div className="flex items-center gap-3 text-background">
              <div className="flex" aria-hidden>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-background text-background" />
                ))}
              </div>
              <span className="font-semibold">4.9/5.0 avaliação</span>
            </div>

            <div className="flex items-center gap-2 text-background">
              <Shield className="h-5 w-5" />
              <span className="font-semibold">Dados 100% seguros</span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
