import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";
import { WHATSAPP_LINK } from "@/lib/links";

type Billing = "monthly" | "annual";

type PlanFeature = {
  text: string;
  highlight?: boolean;
};

type Plan = {
  id: "starter" | "pro" | "enterprise";
  name: string;
  description: string;
  monthlyPrice: string; // display-friendly
  annualPrice: string; // display-friendly
  yearlyDiscount?: string;
  cta: string;
  ctaHref?: string;
  features: PlanFeature[];
};

function BillingToggle({ billing, onChange }: { billing: Billing; onChange: (b: Billing) => void }) {
  const prefersReducedMotion = useReducedMotion();
  const isAnnual = billing === "annual";

  return (
    <motion.div
      className="mb-16 flex flex-wrap items-center justify-center gap-4"
      initial={prefersReducedMotion ? undefined : { opacity: 0, y: -20 }}
      animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
      transition={prefersReducedMotion ? undefined : { duration: 0.6, ease: "easeOut" }}
    >
      <span className={cn("text-sm font-semibold", !isAnnual ? "text-foreground" : "text-muted-foreground")}>
        Mensal
      </span>

      <motion.button
        type="button"
        aria-label="Alternar cobrança mensal/anual"
        className="relative h-10 w-20 rounded-full bg-gradient-to-r from-brand-primary-deep to-brand-primary-light"
        onClick={() => onChange(isAnnual ? "monthly" : "annual")}
        whileTap={prefersReducedMotion ? undefined : { scale: 0.95 }}
      >
        <motion.div
          aria-hidden
          className="absolute left-1 top-1 h-8 w-8 rounded-full bg-background shadow-md"
          animate={prefersReducedMotion ? undefined : { x: isAnnual ? 40 : 0 }}
          transition={prefersReducedMotion ? undefined : { type: "spring", stiffness: 500, damping: 30 }}
        />
      </motion.button>

      <span className={cn("text-sm font-semibold", isAnnual ? "text-foreground" : "text-muted-foreground")}>
        Anual
      </span>

      <motion.div
        className="rounded-full bg-secondary/15 px-3 py-1 text-sm font-bold text-secondary"
        initial={prefersReducedMotion ? undefined : { scale: 0 }}
        animate={prefersReducedMotion ? undefined : { scale: isAnnual ? 1 : 0 }}
        transition={prefersReducedMotion ? undefined : { type: "spring", stiffness: 200 }}
      >
        Economize 20%
      </motion.div>
    </motion.div>
  );
}

function PricingCard({
  plan,
  billing,
  isPopular,
  index,
}: {
  plan: Plan;
  billing: Billing;
  isPopular?: boolean;
  index: number;
}) {
  const prefersReducedMotion = useReducedMotion();
  const [isHovered, setIsHovered] = React.useState(false);

  const price = billing === "annual" ? plan.annualPrice : plan.monthlyPrice;
  const suffix = billing === "annual" ? "/ano" : "/mês";

  return (
    <motion.div
      className={cn("relative", isPopular ? "md:scale-110 md:z-10" : "")}
      initial={prefersReducedMotion ? undefined : { opacity: 0, y: 50 }}
      whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
      transition={prefersReducedMotion ? undefined : { duration: 0.6, ease: "easeOut", delay: index * 0.12 }}
      viewport={{ once: true, margin: "-120px" }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      whileHover={prefersReducedMotion ? undefined : { y: -10 }}
    >
      {/* Floating badge */}
      {isPopular && (
        <motion.div
          className="absolute -top-4 left-1/2 z-20 -translate-x-1/2"
          initial={prefersReducedMotion ? undefined : { y: -20, opacity: 0 }}
          animate={prefersReducedMotion ? undefined : { y: 0, opacity: 1 }}
          transition={prefersReducedMotion ? undefined : { duration: 0.5, delay: 0.3 }}
        >
          <motion.div
            className="rounded-full bg-gradient-to-r from-secondary to-brand-primary-light px-6 py-2 text-sm font-bold text-primary-foreground shadow-lg"
            animate={
              prefersReducedMotion
                ? undefined
                : {
                    y: [0, -5, 0],
                  }
            }
            transition={
              prefersReducedMotion
                ? undefined
                : {
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }
            }
          >
            MAIS POPULAR
          </motion.div>
        </motion.div>
      )}

      {/* Hover glow */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -inset-1 rounded-3xl blur-xl"
        style={{
          backgroundImage:
            "linear-gradient(90deg, hsl(var(--brand-primary)), hsl(var(--brand-primary-light)), hsl(var(--brand-primary)))",
        }}
        animate={{ opacity: isHovered ? 0.5 : 0 }}
        transition={{ duration: 0.3 }}
      />

      {/* Main card */}
      <motion.div
        className={cn(
          "relative overflow-hidden rounded-3xl border-2 bg-card p-8 shadow-xl",
          isPopular ? "border-brand-primary-light" : "border-border",
        )}
        whileHover={
          prefersReducedMotion
            ? undefined
            : {
                borderColor: "hsl(var(--brand-primary-light))",
                boxShadow: "0 30px 80px hsl(var(--brand-primary-light) / 0.30)",
              }
        }
        transition={{ duration: 0.3 }}
      >
        {/* Animated background shape */}
        <motion.div
          aria-hidden
          className="absolute right-0 top-0 h-32 w-32 rounded-full bg-primary/5"
          animate={
            prefersReducedMotion
              ? undefined
              : {
                  scale: isHovered ? [1, 1.5, 1] : 1,
                  rotate: isHovered ? 360 : 0,
                }
          }
          transition={prefersReducedMotion ? undefined : { duration: 2, ease: "easeInOut" }}
        />

        <h3 className="relative z-10 mb-2 text-2xl font-bold">{plan.name}</h3>
        <p className="relative z-10 mb-6 text-muted-foreground">{plan.description}</p>

        {/* Price */}
        <div className="relative z-10 mb-8">
          <div className="flex items-start gap-2">
            <span className="pt-2 text-2xl font-bold text-muted-foreground">R$</span>
            <motion.span
              className="bg-gradient-to-r from-brand-primary-deep to-brand-primary-light bg-clip-text text-6xl font-black text-transparent"
              initial={prefersReducedMotion ? undefined : { scale: 0 }}
              whileInView={prefersReducedMotion ? undefined : { scale: 1 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={
                prefersReducedMotion
                  ? undefined
                  : { type: "spring", stiffness: 200, damping: 15, delay: 0.2 + index * 0.05 }
              }
            >
              {price}
            </motion.span>
            <span className="mt-3 text-xl font-medium text-muted-foreground">{suffix}</span>
          </div>

          {billing === "annual" && plan.yearlyDiscount ? (
            <motion.p
              className="mt-2 text-sm font-semibold text-brand-primary-light"
              initial={prefersReducedMotion ? undefined : { opacity: 0, x: -10 }}
              whileInView={prefersReducedMotion ? undefined : { opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={prefersReducedMotion ? undefined : { delay: 0.4 }}
            >
              Economize R$ {plan.yearlyDiscount} no plano anual
            </motion.p>
          ) : null}
        </div>

        {/* CTA */}
        {plan.ctaHref ? (
          <motion.a
            href={plan.ctaHref}
            target="_blank"
            rel="noreferrer"
            data-cursor="hover"
            className={cn(
              "relative z-10 mb-8 inline-flex w-full items-center justify-center rounded-xl py-4 text-lg font-bold",
              isPopular
                ? "bg-gradient-to-r from-brand-primary-deep to-brand-primary-light text-primary-foreground"
                : "bg-muted text-foreground hover:bg-accent",
            )}
            whileHover={
              prefersReducedMotion
                ? undefined
                : {
                    scale: 1.05,
                    boxShadow: "0 10px 30px hsl(var(--brand-primary-light) / 0.30)",
                  }
            }
            whileTap={prefersReducedMotion ? undefined : { scale: 0.95 }}
            animate={
              prefersReducedMotion
                ? undefined
                : isPopular
                  ? {
                      boxShadow: [
                        "0 0 0 0 hsl(var(--brand-primary-light) / 0)",
                        "0 0 0 12px hsl(var(--brand-primary-light) / 0)",
                      ],
                    }
                  : undefined
            }
            transition={
              prefersReducedMotion
                ? undefined
                : isPopular
                  ? {
                      boxShadow: { duration: 1.5, repeat: Infinity, ease: "easeOut" },
                    }
                  : undefined
            }
          >
            {plan.cta}
          </motion.a>
        ) : (
          <motion.button
            type="button"
            data-cursor="hover"
            className={cn(
              "relative z-10 mb-8 w-full rounded-xl py-4 text-lg font-bold",
              isPopular
                ? "bg-gradient-to-r from-brand-primary-deep to-brand-primary-light text-primary-foreground"
                : "bg-muted text-foreground hover:bg-accent",
            )}
            whileHover={
              prefersReducedMotion
                ? undefined
                : {
                    scale: 1.05,
                    boxShadow: "0 10px 30px hsl(var(--brand-primary-light) / 0.30)",
                  }
            }
            whileTap={prefersReducedMotion ? undefined : { scale: 0.95 }}
            animate={
              prefersReducedMotion
                ? undefined
                : isPopular
                  ? {
                      boxShadow: [
                        "0 0 0 0 hsl(var(--brand-primary-light) / 0)",
                        "0 0 0 12px hsl(var(--brand-primary-light) / 0)",
                      ],
                    }
                  : undefined
            }
            transition={
              prefersReducedMotion
                ? undefined
                : isPopular
                  ? {
                      boxShadow: { duration: 1.5, repeat: Infinity, ease: "easeOut" },
                    }
                  : undefined
            }
          >
            {plan.cta}
          </motion.button>
        )}

        {/* Features */}
        <ul className="relative z-10 space-y-4">
          {plan.features.map((feature, i) => (
            <motion.li
              key={feature.text}
              className="flex items-start gap-3"
              initial={prefersReducedMotion ? undefined : { opacity: 0, x: -20 }}
              whileInView={prefersReducedMotion ? undefined : { opacity: 1, x: 0 }}
              transition={prefersReducedMotion ? undefined : { delay: 0.1 * i, duration: 0.3 }}
              viewport={{ once: true, amount: 0.6 }}
            >
              <motion.div
                className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-brand-primary-lighter"
                initial={prefersReducedMotion ? undefined : { scale: 0, rotate: -180 }}
                whileInView={prefersReducedMotion ? undefined : { scale: 1, rotate: 0 }}
                transition={
                  prefersReducedMotion
                    ? undefined
                    : { type: "spring", stiffness: 200, delay: 0.1 * i + 0.2 }
                }
                viewport={{ once: true, amount: 0.6 }}
              >
                <Check size={16} className="text-brand-primary-light" />
              </motion.div>

              <span className="text-muted-foreground">{feature.text}</span>

              {feature.highlight ? (
                <motion.span
                  className="ml-auto rounded-full bg-secondary/15 px-2 py-1 text-xs font-semibold text-secondary"
                  initial={prefersReducedMotion ? undefined : { scale: 0 }}
                  whileInView={prefersReducedMotion ? undefined : { scale: 1 }}
                  transition={prefersReducedMotion ? undefined : { delay: 0.1 * i + 0.3, type: "spring", stiffness: 220 }}
                  viewport={{ once: true, amount: 0.6 }}
                >
                  NOVO
                </motion.span>
              ) : null}
            </motion.li>
          ))}
        </ul>

        {/* Sparkles (popular + hover) */}
        {isPopular && isHovered && !prefersReducedMotion ? (
          <>
            {Array.from({ length: 10 }).map((_, i) => (
              <motion.div
                key={i}
                aria-hidden
                className="absolute h-1 w-1 rounded-full bg-secondary"
                initial={{ x: "50%", y: "50%", opacity: 1 }}
                animate={{
                  x: `${50 + Math.cos((i * Math.PI * 2) / 10) * 100}%`,
                  y: `${50 + Math.sin((i * Math.PI * 2) / 10) * 100}%`,
                  opacity: 0,
                  scale: [1, 1.5, 0],
                }}
                transition={{ duration: 1, delay: i * 0.05, ease: "easeOut" }}
              />
            ))}
          </>
        ) : null}
      </motion.div>
    </motion.div>
  );
}

export function PricingSection({ className }: { className?: string }) {
  const [billing, setBilling] = React.useState<Billing>("monthly");

  const plans: Plan[] = React.useMemo(
    () => [
      {
        id: "starter",
        name: "Starter",
        description: "Para quem está começando",
        monthlyPrice: "79",
        annualPrice: "758",
        yearlyDiscount: "190",
        cta: "Selecionar Plano",
        features: [
          { text: "Até 1.000 contatos" },
          { text: "3 fluxos ZapFllow" },
          { text: "1 usuário" },
          { text: "Templates básicos" },
          { text: "Suporte por email" },
          { text: "Relatórios básicos" },
          { text: "WhatsApp oficial integrado" },
        ],
      },
      {
        id: "pro",
        name: "Pro",
        description: "Para negócios em crescimento",
        monthlyPrice: "197",
        annualPrice: "1.894",
        yearlyDiscount: "470",
        cta: "Começar Agora",
        features: [
          { text: "Até 10.000 contatos" },
          { text: "Fluxos ilimitados" },
          { text: "5 usuários" },
          { text: "Templates avançados", highlight: true },
          { text: "Suporte prioritário (chat)" },
          { text: "Relatórios avançados" },
          { text: "Integrações (Zapier, Sheets, etc)" },
          { text: "API de acesso" },
          { text: "Webhooks personalizados", highlight: true },
          { text: "Pagamento Pix integrado" },
        ],
      },
      {
        id: "enterprise",
        name: "Enterprise",
        description: "Para operações em larga escala",
        monthlyPrice: "Sob consulta",
        annualPrice: "Sob consulta",
        cta: "Falar com vendas",
        ctaHref: WHATSAPP_LINK,
        features: [
          { text: "Contatos ilimitados" },
          { text: "Usuários ilimitados" },
          { text: "Múltiplos números WhatsApp" },
          { text: "Gerente de conta dedicado" },
          { text: "SLA garantido" },
          { text: "Onboarding personalizado" },
          { text: "White-label (opcional)" },
          { text: "Infraestrutura dedicada" },
          { text: "Suporte 24/7" },
        ],
      },
    ],
    [],
  );

  return (
    <div className={cn("mx-auto max-w-7xl px-4 py-20", className)}>
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight">Escolha o Plano Ideal para Seu Negócio</h2>
          <p className="mt-2 text-muted-foreground">Todos os planos incluem 7 dias grátis. Cancele quando quiser.</p>
        </div>

        <BillingToggle billing={billing} onChange={setBilling} />

        <div className="grid gap-6 md:grid-cols-3">
          {plans.map((plan, index) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              billing={billing}
              isPopular={plan.id === "pro"}
              index={index}
            />
          ))}
        </div>

        <div className="mt-10 text-center text-sm text-muted-foreground">
          <p>Todos os preços em Reais (BRL). Impostos não inclusos.</p>
          <a href="#" className="mt-2 inline-block text-primary hover:underline">
            Ver comparação completa de recursos
          </a>
        </div>
    </div>
  );
}
