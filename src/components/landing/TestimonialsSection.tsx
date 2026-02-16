import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { Check, Star } from "lucide-react";

import { cn } from "@/lib/utils";

type Testimonial = {
  name: string;
  role: string;
  company: string;
  text: string;
  result?: string;
};

function InitialsAvatar({ name }: { name: string }) {
  const initials = React.useMemo(() => {
    const parts = name.trim().split(/\s+/).slice(0, 2);
    return parts
      .map((p) => p[0]?.toUpperCase())
      .join("")
      .slice(0, 2);
  }, [name]);

  return (
    <div
      className="relative grid h-14 w-14 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-brand-primary-deep to-brand-primary-light"
      aria-hidden
    >
      <span className="text-sm font-bold text-primary-foreground">{initials}</span>
    </div>
  );
}

function TestimonialCard({ testimonial, index }: { testimonial: Testimonial; index: number }) {
  const prefersReducedMotion = useReducedMotion();
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <motion.div
      className="h-full"
      initial={prefersReducedMotion ? undefined : { opacity: 0, y: 50 }}
      whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
      transition={prefersReducedMotion ? undefined : { delay: index * 0.08, duration: 0.55, ease: "easeOut" }}
      viewport={{ once: true, margin: "-120px" }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
    >
      <motion.div
        className="relative h-full overflow-hidden rounded-3xl border bg-card p-8 shadow-xl"
        whileHover={
          prefersReducedMotion
            ? undefined
            : {
                y: -10,
                boxShadow: "0 30px 80px hsl(var(--foreground) / 0.10)",
                borderColor: "hsl(var(--brand-primary-light))",
              }
        }
        transition={{ duration: 0.3 }}
      >
        {/* Quote decoration */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -top-10 right-4 select-none text-[140px] font-serif leading-none text-primary/10"
          animate={prefersReducedMotion ? undefined : { rotate: isHovered ? 10 : 0, scale: isHovered ? 1.1 : 1 }}
          transition={prefersReducedMotion ? undefined : { type: "spring", stiffness: 220, damping: 18 }}
        >
          “
        </motion.div>

        {/* Stars */}
        <div className="relative z-10 mb-4 flex gap-1">
          {Array.from({ length: 5 }).map((_, i) => (
            <motion.div
              key={i}
              initial={prefersReducedMotion ? undefined : { scale: 0, rotate: -180 }}
              whileInView={prefersReducedMotion ? undefined : { scale: 1, rotate: 0 }}
              transition={prefersReducedMotion ? undefined : { type: "spring", stiffness: 220, delay: i * 0.05 }}
              viewport={{ once: true, amount: 0.7 }}
            >
              <Star className="h-5 w-5 fill-secondary text-secondary" />
            </motion.div>
          ))}
        </div>

        {/* Text */}
        <motion.p
          className="relative z-10 mb-6 text-muted-foreground italic"
          initial={prefersReducedMotion ? undefined : { opacity: 0 }}
          whileInView={prefersReducedMotion ? undefined : { opacity: 1 }}
          transition={prefersReducedMotion ? undefined : { delay: 0.15 }}
          viewport={{ once: true, amount: 0.7 }}
        >
          “{testimonial.text}”
        </motion.p>

        {/* Author */}
        <div className="relative z-10 flex items-center gap-4">
          <motion.div
            className="relative"
            whileHover={prefersReducedMotion ? undefined : { scale: 1.08, rotate: 4 }}
            transition={prefersReducedMotion ? undefined : { type: "spring", stiffness: 260, damping: 16 }}
          >
            <InitialsAvatar name={testimonial.name} />
            <motion.div
              aria-hidden
              className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full bg-brand-primary-light"
              initial={prefersReducedMotion ? undefined : { scale: 0 }}
              animate={prefersReducedMotion ? undefined : { scale: 1 }}
              transition={prefersReducedMotion ? undefined : { delay: 0.25, type: "spring", stiffness: 240 }}
            >
              <Check size={14} className="text-primary-foreground" />
            </motion.div>
          </motion.div>

          <div className="min-w-0">
            <p className="truncate font-bold text-foreground">{testimonial.name}</p>
            <p className="truncate text-sm text-muted-foreground">{testimonial.role}</p>
            <p className="truncate text-xs font-semibold text-primary">{testimonial.company}</p>
          </div>
        </div>

        {/* Result */}
        {testimonial.result ? (
          <motion.div
            className="relative z-10 mt-6 rounded-xl border bg-muted/50 p-4"
            initial={prefersReducedMotion ? undefined : { opacity: 0, y: 12 }}
            animate={prefersReducedMotion ? undefined : { opacity: isHovered ? 1 : 0.8, y: 0 }}
            transition={prefersReducedMotion ? undefined : { duration: 0.25 }}
          >
            <p className="text-sm font-semibold text-foreground">{testimonial.result}</p>
          </motion.div>
        ) : null}
      </motion.div>
    </motion.div>
  );
}

function LogosMarquee({ items }: { items: string[] }) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <div className="relative mt-20">
      <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-20 bg-gradient-to-r from-background to-transparent z-10" />
      <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-gradient-to-l from-background to-transparent z-10" />

      <motion.div
        className="flex gap-10"
        animate={prefersReducedMotion ? undefined : { x: [0, -1000] }}
        transition={
          prefersReducedMotion
            ? undefined
            : {
                duration: 20,
                repeat: Infinity,
                ease: "linear",
              }
        }
      >
        {[...items, ...items].map((name, index) => (
          <div key={`${name}-${index}`} className="flex-shrink-0">
            <div
              className={cn(
                "grid place-items-center rounded-full border bg-card/60 px-6 py-3",
                "text-sm font-semibold text-muted-foreground",
                "opacity-60 transition-opacity hover:opacity-100",
              )}
            >
              {name}
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

export function TestimonialsSection({ className }: { className?: string }) {
  const prefersReducedMotion = useReducedMotion();

  const testimonials: Testimonial[] = React.useMemo(
    () => [
      {
        name: "Dra. Maria Silva",
        role: "Médica",
        company: "Clínica Saúde+",
        text: "Aumentei em 40% as confirmações e reduzi faltas. O bot funciona 24h e meus pacientes adoram.",
        result: "40% mais confirmações e menos faltas",
      },
      {
        name: "João Santos",
        role: "E-commerce",
        company: "Loja Virtual Mix",
        text: "Recuperei vendas de carrinho abandonado já no primeiro mês. Virou essencial para o meu atendimento.",
        result: "Mais conversão com carrinho abandonado",
      },
      {
        name: "Carlos Oliveira",
        role: "Gestor",
        company: "Salão Beleza Pura",
        text: "Automatizei agendamentos e liberei horas por dia. Agora foco no que realmente importa: atender bem.",
        result: "Mais tempo no atendimento presencial",
      },
      {
        name: "Fernanda Lima",
        role: "Comercial",
        company: "Imobiliária Horizonte",
        text: "A qualificação automática elevou a taxa de resposta. Chegamos nas pessoas certas no tempo certo.",
        result: "Leads mais qualificados no funil",
      },
      {
        name: "Paulo Almeida",
        role: "Founder",
        company: "Academia Fit+",
        text: "Os lembretes e campanhas segmentadas aumentaram retenção. E o painel deixa tudo muito claro.",
        result: "Mais retenção e recorrência",
      },
    ],
    [],
  );

  const logos = React.useMemo(
    () => ["Clínica X", "Salão Y", "Loja Z", "Imobiliária W", "Academia Q", "Escola T", "Delivery K"],
    [],
  );

  const autoplay = React.useMemo(
    () => Autoplay({ delay: 3000, stopOnInteraction: false, stopOnMouseEnter: true }),
    [],
  );

  const [emblaRef] = useEmblaCarousel(
    { loop: true, align: "start", skipSnaps: false },
    prefersReducedMotion ? [] : [autoplay],
  );

  return (
    <section id="depoimentos" className={cn("overflow-hidden border-t bg-background", className)}>
      <div className="mx-auto max-w-7xl px-4 py-24">
        <motion.div
          className="mx-auto mb-16 max-w-3xl text-center"
          initial={prefersReducedMotion ? undefined : { opacity: 0, y: 30 }}
          whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-120px" }}
          transition={prefersReducedMotion ? undefined : { duration: 0.6, ease: "easeOut" }}
        >
          <h2 className="text-balance text-4xl font-black tracking-tight sm:text-5xl">Quem Já Usa, Aprova</h2>
          <p className="mt-4 text-lg text-muted-foreground sm:text-xl">
            Milhares de empresas já automatizaram com sucesso
          </p>
        </motion.div>

        {/* Carousel */}
        <div ref={emblaRef} className="overflow-visible">
          <div className="flex gap-6">
            {testimonials.map((testimonial, index) => (
              <div
                key={`${testimonial.name}-${index}`}
                className="flex-[0_0_90%] md:flex-[0_0_45%] lg:flex-[0_0_30%]"
              >
                <TestimonialCard testimonial={testimonial} index={index} />
              </div>
            ))}
          </div>
        </div>

        {/* Logos */}
        <LogosMarquee items={logos} />
      </div>
    </section>
  );
}
