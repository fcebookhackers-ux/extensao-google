import * as React from "react";
import { AnimatePresence, motion, useReducedMotion, useScroll } from "framer-motion";
import { RevealSection } from "@/components/motion/RevealSection";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/providers/AuthProvider";
import { supabase } from "@/integrations/supabase/client";
import { LandingFooter } from "@/components/landing/LandingFooter";
import {
  ArrowRight,
  BarChart,
  Blocks,
  Check,
  Clock,
  Database,
  DollarSign,
  Dumbbell,
  FileCheck,
  GraduationCap,
  Home,
  Menu,
  MessageCircle,
  MessageSquare,
  QrCode,
  Rocket,
  ArrowUp,
  Scissors,
  ShoppingCart,
  Stethoscope,
  Users,
  Zap,
  Bot,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { HowItWorksTimeline } from "@/components/landing/HowItWorksTimeline";
import { FeatureCard } from "@/components/landing/FeatureCard";
import { AnimatedShaderBackground } from "@/components/landing/AnimatedShaderBackground";
import headerLogo from "@/assets/header-logo.png";
import { WHATSAPP_LINK } from "@/lib/links";
const PricingSection = React.lazy(() =>
  import("@/components/landing/PricingSection").then((m) => ({ default: m.PricingSection })),
);
const TestimonialsSection = React.lazy(() =>
  import("@/components/landing/TestimonialsSection").then((m) => ({ default: m.TestimonialsSection })),
);
const LandingFaqSection = React.lazy(() =>
  import("@/components/landing/LandingFaqSection").then((m) => ({ default: m.LandingFaqSection })),
);
const FinalEpicCta = React.lazy(() =>
  import("@/components/landing/FinalEpicCta").then((m) => ({ default: m.FinalEpicCta })),
);

const navItems = [
  { label: "Recursos", href: "#recursos" },
  { label: "Preços", href: "#precos" },
];

const segments = [
  {
    key: "clinicas",
    Icon: Stethoscope,
    title: "Clínicas e Consultórios",
    features: [
      "Agendamento automático de consultas",
      "Confirmação e lembrete via WhatsApp",
      "Envio de exames e resultados",
      "Pesquisa de satisfação pós-consulta",
    ],
    example:
      "Olá Maria! Sua consulta está agendada para 15/02 às 14h. Confirme respondendo SIM.",
  },
  {
    key: "saloes",
    Icon: Scissors,
    title: "Salões de Beleza",
    features: [
      "Agendamento de horários",
      "Envio de promoções personalizadas",
      "Lembretes de retorno",
      "Programa de fidelidade",
    ],
    example: "Oi Ana! Temos um horário amanhã às 16h. Quer confirmar?",
  },
  {
    key: "ecommerce",
    Icon: ShoppingCart,
    title: "E-commerce",
    features: [
      "Rastreamento de pedidos automático",
      "Recuperação de carrinho abandonado",
      "Ofertas personalizadas",
      "Suporte pós-venda",
    ],
    example: "Seu pedido #18452 saiu para entrega. Acompanhe por aqui: ...",
  },
  {
    key: "imobiliarias",
    Icon: Home,
    title: "Imobiliárias",
    features: [
      "Qualificação de leads",
      "Envio de imóveis disponíveis",
      "Agendamento de visitas",
      "Follow-up automatizado",
    ],
    example: "Tenho 3 imóveis com 2 quartos dentro do seu orçamento. Quer ver as opções?",
  },
  {
    key: "infoprodutores",
    Icon: GraduationCap,
    title: "Infoprodutores",
    features: [
      "Entrega de conteúdo",
      "Suporte a alunos",
      "Lançamentos automáticos",
      "Upsell de produtos",
    ],
    example: "Bem-vindo ao curso! Aqui está a aula 1. Quer que eu te lembre amanhã?",
  },
  {
    key: "academias",
    Icon: Dumbbell,
    title: "Academias",
    features: [
      "Lembrete de treinos",
      "Renovação de planos",
      "Envio de fichas",
      "Promoções e desafios",
    ],
    example: "Bora treinar hoje? Seu treino A está pronto. Quer receber a ficha agora?",
  },
];

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const prefersReducedMotion = useReducedMotion();
  const { scrollYProgress } = useScroll();

  const headlineWords = ["Automatize", "seu", "WhatsApp", "Business", "e", "venda", "24/7"]; 

  const [mousePosition, setMousePosition] = React.useState({ x: 0, y: 0 });
  const [isFinePointer, setIsFinePointer] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const mql = window.matchMedia("(pointer: fine)");
    const onChange = () => setIsFinePointer(mql.matches);
    onChange();
    mql.addEventListener?.("change", onChange);
    return () => mql.removeEventListener?.("change", onChange);
  }, []);

  React.useEffect(() => {
    if (prefersReducedMotion || !isFinePointer) return;

    let raf = 0;
    const handleMouseMove = (e: MouseEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        setMousePosition({
          x: (e.clientX / window.innerWidth - 0.5) * 20,
          y: (e.clientY / window.innerHeight - 0.5) * 20,
        });
      });
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, [isFinePointer, prefersReducedMotion]);

  React.useEffect(() => {
    const t = window.setTimeout(() => setLoading(false), 2000);
    return () => window.clearTimeout(t);
  }, []);

  React.useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const onSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      {/* Loading screen */}
      <AnimatePresence>
        {loading && (
          <motion.div
            className="fixed inset-0 z-[200] flex items-center justify-center bg-background"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.div
              animate={prefersReducedMotion ? undefined : { scale: [1, 1.2, 1], rotate: [0, 180, 360] }}
              transition={prefersReducedMotion ? undefined : { duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <MessageCircle size={64} className="text-brand-primary-light" />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scroll progress */}
      <motion.div
        aria-hidden
        className="fixed left-0 right-0 top-0 z-[120] h-1 origin-left"
        style={{
          scaleX: scrollYProgress,
          backgroundImage: "linear-gradient(90deg, hsl(var(--brand-primary)), hsl(var(--brand-primary-light)))",
        }}
      />

      <motion.header
        className={
          "fixed top-0 z-50 w-full transition-all " +
          (scrolled ? "border-b bg-background/80 backdrop-blur-lg shadow-lg" : "bg-transparent")
        }
        initial={prefersReducedMotion ? undefined : { y: -100 }}
        animate={prefersReducedMotion ? undefined : { y: 0 }}
        transition={prefersReducedMotion ? undefined : { duration: 0.5, ease: "easeOut" }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <Link to="/" className="flex items-center gap-2">
            <img
              src={headerLogo}
              alt="Logo ZapFllow"
              className="h-9 w-9 rounded-md object-contain"
              loading="eager"
            />
            <div className="leading-tight">
              <p className="text-sm font-semibold">ZapFllow</p>
              <p className="text-xs text-muted-foreground">ZapFllow para PMEs brasileiras</p>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-6 md:flex">
            {navItems.map((item) => (
              <a key={item.href} href={item.href} className="text-sm text-muted-foreground hover:text-foreground">
                {item.label}
              </a>
            ))}
            {user ? (
              <>
                <Link to="/dashboard/inicio" className="text-sm text-muted-foreground hover:text-foreground">
                  Dashboard
                </Link>
                <Button variant="outline" onClick={onSignOut}>
                  Sair
                </Button>
              </>
            ) : (
              <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">
                Login
              </Link>
            )}
            <Button
              asChild
              className="bg-brand-primary-light text-primary-foreground hover:bg-brand-primary-light/90"
            >
              <Link to={user ? "/dashboard/inicio" : "/cadastro"}>Começar Grátis</Link>
            </Button>
          </nav>

          {/* Mobile nav */}
          <div className="flex items-center gap-2 md:hidden">
            <Button
              asChild
              size="sm"
              className="bg-brand-primary-light text-primary-foreground hover:bg-brand-primary-light/90"
            >
              <Link to={user ? "/dashboard/inicio" : "/cadastro"}>Começar</Link>
            </Button>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" aria-label="Abrir menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[320px]">
                <SheetHeader>
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>
                <div className="mt-6 grid gap-2">
                  {navItems.map((item) => (
                    <a
                      key={item.href}
                      href={item.href}
                      className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    >
                      {item.label}
                    </a>
                  ))}
                  <Link
                    to={user ? "/dashboard/inicio" : "/login"}
                    className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  >
                    {user ? "Ir para o Dashboard" : "Login"}
                  </Link>
                  {user ? (
                    <Button variant="outline" onClick={onSignOut}>
                      Sair
                    </Button>
                  ) : null}
                  <Button
                    asChild
                    className="mt-2 bg-brand-primary-light text-primary-foreground hover:bg-brand-primary-light/90"
                  >
                    <Link to={user ? "/dashboard/inicio" : "/cadastro"}>Começar Grátis</Link>
                  </Button>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </motion.header>

      <main className="pt-20">
        <section className="relative overflow-hidden">
            {/* Fundo: shader (substitui apenas o verde) */}
            <AnimatedShaderBackground className="absolute inset-0" />

            {/* Grid sutil (pontos claros sobre o verde) */}
            <motion.div
              aria-hidden
              className="absolute inset-0 opacity-15"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 20% 50%, hsl(var(--primary-foreground)) 1px, transparent 1px)",
                backgroundSize: "56px 56px",
              }}
              animate={prefersReducedMotion ? undefined : { backgroundPosition: ["0px 0px", "56px 56px"] }}
              transition={prefersReducedMotion ? undefined : { duration: 22, repeat: Infinity, ease: "linear" }}
            />

            {/* Floating blobs */}
            <div aria-hidden className="absolute inset-0">
            {[
              { top: "-8%", left: "-6%", size: 460, delay: 0 },
              { top: "18%", right: "-10%", size: 520, delay: 1.2 },
              { bottom: "-12%", left: "18%", size: 420, delay: 0.6 },
              { bottom: "6%", right: "22%", size: 260, delay: 1.8 },
            ].map((b, idx) => (
              <motion.div
                key={idx}
                  className="absolute rounded-full opacity-35 blur-[70px]"
                style={{
                  width: b.size,
                  height: b.size,
                  ...("top" in b ? { top: b.top } : {}),
                  ...("bottom" in b ? { bottom: b.bottom } : {}),
                  ...("left" in b ? { left: b.left } : {}),
                  ...("right" in b ? { right: b.right } : {}),
                }}
                initial={false}
                animate={
                  prefersReducedMotion
                    ? undefined
                    : {
                        x: [0, 18, -10, 0],
                        y: [0, -22, 14, 0],
                      }
                }
                transition={
                  prefersReducedMotion
                    ? undefined
                    : {
                        duration: 18,
                        ease: "easeInOut",
                        repeat: Infinity,
                        delay: b.delay,
                      }
                }
              >
                <motion.div
                    className="h-full w-full rounded-full bg-gradient-to-br from-primary-foreground/25 via-brand-primary-lighter/35 to-primary-foreground/10"
                  animate={
                    prefersReducedMotion || !isFinePointer
                      ? undefined
                      : {
                          x: mousePosition.x * 2,
                          y: mousePosition.y * 2,
                        }
                  }
                  transition={
                    prefersReducedMotion || !isFinePointer
                      ? undefined
                      : { type: "spring", stiffness: 50, damping: 15 }
                  }
                />
              </motion.div>
            ))}
          </div>

            {/* Floating icons (ambiente 3D leve) */}
            <div aria-hidden className="absolute inset-0">
            {[
              { Icon: MessageSquare, top: "18%", left: "10%", size: 28, delay: 0 },
              { Icon: Bot, top: "28%", left: "82%", size: 34, delay: 0.3 },
              { Icon: QrCode, top: "62%", left: "14%", size: 30, delay: 0.6 },
              { Icon: BarChart, top: "66%", left: "84%", size: 36, delay: 0.9 },
              { Icon: Zap, top: "44%", left: "52%", size: 26, delay: 1.2 },
            ].map(({ Icon, top, left, size, delay }, i) => (
              <motion.div
                key={i}
                className="absolute opacity-30"
                style={{ top, left }}
                initial={false}
                animate={
                  prefersReducedMotion
                    ? undefined
                    : {
                        y: [0, -20, 0],
                        rotate: [0, 10, -10, 0],
                      }
                }
                transition={
                  prefersReducedMotion
                    ? undefined
                    : {
                        duration: 3 + i * 0.5,
                        repeat: Infinity,
                        ease: "easeInOut",
                        delay,
                      }
                }
              >
                  <Icon className="text-primary-foreground/30" size={size} />
              </motion.div>
            ))}
          </div>

          <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-20 md:grid-cols-2 md:items-center">
            {/* Left: Transparent (no card background) */}
            <div className="p-10 md:p-16">
              <div className="space-y-6">
                {/* Badge (entra primeiro) */}
                <motion.div
                  initial={prefersReducedMotion ? undefined : { opacity: 0, y: -20 }}
                  animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                  transition={prefersReducedMotion ? undefined : { duration: 0.6, ease: "easeOut" }}
                >
                  <Badge
                    variant="outline"
                    className="w-fit border-primary-foreground/30 bg-transparent text-primary-foreground"
                  >
                    🚀 Automatize seu WhatsApp
                  </Badge>
                </motion.div>

                {/* Headline (palavra por palavra) */}
                <motion.h1
                  className="text-balance text-4xl font-extrabold tracking-[-0.02em] sm:text-5xl"
                  initial={prefersReducedMotion ? undefined : { opacity: 0 }}
                  animate={prefersReducedMotion ? undefined : { opacity: 1 }}
                  transition={prefersReducedMotion ? undefined : { duration: 0.8, delay: 0.2 }}
                >
                  <span className="text-primary-foreground">
                    {headlineWords.map((word, i) => (
                      <motion.span
                        key={word + i}
                        initial={prefersReducedMotion ? undefined : { opacity: 0, y: 20 }}
                        animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                        transition={prefersReducedMotion ? undefined : { duration: 0.5, delay: 0.3 + i * 0.1 }}
                        style={{ display: "inline-block", marginRight: "0.3em" }}
                      >
                        {word}
                      </motion.span>
                    ))}
                  </span>
                </motion.h1>

                {/* Subheadline */}
                <motion.p
                  className="text-pretty text-base text-primary-foreground/80 sm:text-xl"
                  initial={prefersReducedMotion ? undefined : { opacity: 0, y: 20 }}
                  animate={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                  transition={prefersReducedMotion ? undefined : { duration: 0.6, delay: 0.8, ease: "easeOut" }}
                >
                  Chatbots inteligentes, campanhas em massa e gestão completa de clientes. Tudo em português e sem
                  complicação.
                </motion.p>

                {/* Botões (spring) */}
                <motion.div
                  className="flex flex-col gap-3 sm:flex-row"
                  initial={prefersReducedMotion ? undefined : { opacity: 0, scale: 0.8 }}
                  animate={prefersReducedMotion ? undefined : { opacity: 1, scale: 1 }}
                  transition={
                    prefersReducedMotion
                      ? undefined
                      : { duration: 0.6, delay: 1.2, type: "spring", stiffness: 200, damping: 15 }
                  }
                >
                  <Button
                    asChild
                    size="lg"
                    className="bg-brand-primary-light text-primary-foreground hover:bg-brand-primary-light/90"
                  >
                    <Link to={user ? "/dashboard/inicio" : "/cadastro"}>
                      <Rocket className="h-4 w-4" />
                      Começar Grátis por 7 Dias
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    asChild
                    className="border-input bg-background/70 text-emerald-600 hover:bg-accent hover:text-emerald-700"
                  >
                    <a href={WHATSAPP_LINK} target="_blank" rel="noreferrer">
                      <svg
                        aria-hidden="true"
                        viewBox="0 0 24 24"
                        className="h-4 w-4"
                        fill="currentColor"
                      >
                        <path d="M12 2a10 10 0 0 0-8.77 14.79L2 22l5.4-1.42A10 10 0 1 0 12 2zm0 1.8a8.2 8.2 0 0 1 0 16.4c-1.48 0-2.88-.4-4.1-1.16l-.3-.18-3.11.82.83-3.05-.2-.32A8.2 8.2 0 0 1 12 3.8z" />
                        <path d="M16.6 14.6c-.2.57-1.1 1.06-1.5 1.14-.4.08-.9.12-1.46-.06-.34-.1-.78-.25-1.35-.5-2.37-1.03-3.89-3.54-4.01-3.7-.12-.16-.96-1.28-.96-2.44 0-1.16.6-1.73.83-1.96.22-.23.47-.28.63-.28h.45c.14 0 .33-.05.52.4.2.47.67 1.62.73 1.74.06.12.1.27.02.43-.08.16-.12.27-.24.42-.12.15-.26.33-.37.44-.12.12-.24.25-.1.49.14.24.63 1.05 1.35 1.7.93.83 1.7 1.09 1.95 1.2.24.12.38.1.52-.06.14-.16.6-.7.76-.94.16-.24.32-.2.53-.12.22.08 1.38.65 1.61.77.23.12.38.18.44.28.06.1.06.58-.14 1.15z" />
                      </svg>
                      WhatsApp
                    </a>
                  </Button>
                </motion.div>

                <p className="text-sm text-primary-foreground/70">✓ Sem cartão de crédito ✓ Cancele quando quiser</p>
              </div>
            </div>

            {/* Right */}
            <motion.div
              className="relative"
              initial={prefersReducedMotion ? undefined : { opacity: 0, x: 100, rotate: -5 }}
              animate={prefersReducedMotion ? undefined : { opacity: 1, x: 0, rotate: 0 }}
              transition={
                prefersReducedMotion
                  ? undefined
                  : { duration: 0.8, delay: 0.6, type: "spring", stiffness: 80, damping: 12 }
              }
            >
              <motion.div
                className="relative"
                animate={
                  prefersReducedMotion || !isFinePointer
                    ? undefined
                    : {
                        x: mousePosition.x * 0.5,
                        y: mousePosition.y * 0.5,
                        rotateY: mousePosition.x * 0.5,
                        rotateX: -mousePosition.y * 0.5,
                      }
                }
                transition={
                  prefersReducedMotion || !isFinePointer
                    ? undefined
                    : { type: "spring", stiffness: 100, damping: 20 }
                }
                style={{ transformStyle: "preserve-3d", perspective: 900 }}
              >
              <div className="absolute -inset-6 rounded-2xl bg-gradient-to-br from-brand-primary-lighter/60 via-background/50 to-background/30 blur-2xl" />
              <Card className="relative overflow-hidden border-border/60 bg-card/60 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <Zap className="h-5 w-5" /> Dashboard (placeholder)
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Troque por uma ilustração do undraw quando quiser.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3">
                    <div className="rounded-lg border border-border/60 bg-background/60 p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-foreground">Campanha “Janeiro”</p>
                        <Badge className="bg-accent text-accent-foreground">Ativa</Badge>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">2.340 envios • 18% respostas</p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-background/60 p-4">
                      <p className="text-sm font-medium text-foreground">Bot de boas-vindas</p>
                      <p className="mt-1 text-sm text-muted-foreground">Tempo médio de resposta: 12s</p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-background/60 p-4">
                      <p className="text-sm font-medium text-foreground">Fila de atendimento</p>
                      <p className="mt-1 text-sm text-muted-foreground">8 conversas abertas</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              </motion.div>
            </motion.div>
          </div>
        </section>

        <RevealSection id="problemas" className="border-t bg-background/60">
          <div className="mx-auto max-w-7xl px-4 py-20">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <h2 className="text-3xl font-semibold tracking-tight">Problemas que Resolvemos</h2>
              <p className="mt-2 text-muted-foreground">
                ZapFllow no WhatsApp para vender mais, com menos esforço e zero bagunça.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <Card className="bg-card shadow-sm transition-shadow hover:shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" /> Perde vendas fora do horário?
                  </CardTitle>
                  <CardDescription>
                    Seu bot responde automaticamente 24/7, mesmo quando você está dormindo
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="bg-card shadow-sm transition-shadow hover:shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" /> WhatsApp lotado e desorganizado?
                  </CardTitle>
                  <CardDescription>
                    Organize conversas, marque clientes e nunca mais perca um follow-up
                  </CardDescription>
                </CardHeader>
              </Card>

              <Card className="bg-card shadow-sm transition-shadow hover:shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" /> Sem tempo para responder todos?
                  </CardTitle>
                  <CardDescription>ZapFllow inteligentes filtram leads e agendam automaticamente</CardDescription>
                </CardHeader>
              </Card>
            </div>
          </div>
        </RevealSection>

        <HowItWorksTimeline />

        <RevealSection id="recursos-principais" className="border-t bg-background">
          <div className="mx-auto max-w-7xl px-4 py-20">
            <div className="mx-auto mb-12 max-w-3xl text-center">
              <h2 className="text-3xl font-semibold tracking-tight">Tudo que Você Precisa em Uma Plataforma</h2>
              <p className="mt-2 text-muted-foreground">
                Do primeiro atendimento ao relatório final — tudo no mesmo lugar.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {[
                {
                  Icon: Bot,
                  title: "Chatbots Visuais",
                  description: "Crie fluxos conversacionais sem programar, com editor drag-and-drop.",
                },
                {
                  Icon: FileCheck,
                  title: "Templates Aprovados",
                  description: "Use templates pré-aprovados pelo WhatsApp para campanhas em massa.",
                },
                {
                  Icon: Database,
                  title: "CRM Integrado",
                  description: "Gerencie contatos, histórico e tags em um só lugar, com segmentação inteligente.",
                },
                {
                  Icon: DollarSign,
                  title: "Pagamento Pix",
                  description: "Receba pagamentos direto no chat com Pix integrado e experiência fluida para o cliente.",
                },
                {
                  Icon: Users,
                  title: "Multi-Atendente",
                  description: "Equipe completa atendendo no mesmo número com distribuição e roteamento inteligente.",
                },
                {
                  Icon: BarChart,
                  title: "Analytics em Tempo Real",
                  description: "Acompanhe métricas, conversões e performance dos fluxos para otimizar resultados.",
                },
              ].map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={prefersReducedMotion ? undefined : { opacity: 0, y: 50 }}
                  whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                  transition={
                    prefersReducedMotion
                      ? undefined
                      : {
                          duration: 0.5,
                          delay: index * 0.1,
                          ease: "easeOut",
                        }
                  }
                  viewport={{ once: true, margin: "-100px" }}
                >
                  <FeatureCard {...feature} />
                </motion.div>
              ))}
            </div>
          </div>
        </RevealSection>

        <RevealSection id="segmentos" className="border-t bg-background">
          <div className="mx-auto max-w-7xl px-4 py-20">
            <div className="mx-auto mb-12 max-w-2xl text-center">
              <h2 className="text-3xl font-semibold tracking-tight">Perfeito para o Seu Negócio</h2>
              <p className="mt-2 text-muted-foreground">
                Escolha um segmento e veja rapidamente como o ZapFllow se encaixa na sua rotina.
              </p>
            </div>

            {isMobile ? (
              <Accordion type="single" collapsible className="mx-auto max-w-3xl">
                {segments.map(({ key, Icon, title, features, example }) => (
                  <AccordionItem key={key} value={key}>
                    <AccordionTrigger>
                      <span className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {title}
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="grid gap-4">
                        <ul className="grid gap-2 text-sm">
                          {features.map((f) => (
                            <li key={f} className="flex items-start gap-2">
                              <Check className="mt-0.5 h-4 w-4 text-brand-primary-light" />
                              <span className="text-muted-foreground">{f}</span>
                            </li>
                          ))}
                        </ul>

                        <Card className="bg-muted/30">
                          <CardContent className="p-4">
                            <p className="text-xs text-muted-foreground">Exemplo de mensagem</p>
                            <div className="mt-2 w-fit max-w-full rounded-2xl rounded-tl-md bg-background p-3 shadow-sm">
                              <p className="text-sm">{example}</p>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            ) : (
              <Tabs defaultValue={segments[0].key} className="mx-auto max-w-6xl">
                <TabsList className="h-auto w-full flex-wrap justify-center gap-1 p-1">
                  {segments.map(({ key, Icon, title }) => (
                    <TabsTrigger key={key} value={key} className="gap-2">
                      <Icon className="h-4 w-4" />
                      {title}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {segments.map(({ key, title, features, example }) => (
                  <TabsContent key={key} value={key} className="mt-8">
                    <div className="grid gap-6 md:grid-cols-2 md:items-start">
                      <Card>
                        <CardHeader>
                          <CardTitle>{title}</CardTitle>
                          <CardDescription>Casos de uso comuns para este segmento.</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ul className="grid gap-2 text-sm">
                            {features.map((f) => (
                              <li key={f} className="flex items-start gap-2">
                                <Check className="mt-0.5 h-4 w-4 text-brand-primary-light" />
                                <span className="text-muted-foreground">{f}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>

                      <Card className="bg-muted/30">
                        <CardHeader>
                          <CardTitle>Mockup WhatsApp</CardTitle>
                          <CardDescription>Como um ZapFllow aparece para o cliente.</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="rounded-xl border bg-background p-4">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium">WhatsApp</p>
                              <Badge variant="secondary">ZapFllow</Badge>
                            </div>
                            <div className="mt-3 grid gap-2">
                              <div className="w-fit max-w-full rounded-2xl rounded-tr-md bg-muted p-3">
                                <p className="text-sm text-muted-foreground">Oi! Posso te ajudar?</p>
                              </div>
                              <div className="ml-auto w-fit max-w-full rounded-2xl rounded-tl-md bg-background p-3 shadow-sm">
                                <p className="text-sm">{example}</p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </div>
        </RevealSection>

        <RevealSection id="recursos" className="border-t bg-background/60">
          <div className="mx-auto max-w-7xl px-4 py-16">
            <div className="mb-8 max-w-2xl">
              <h2 className="text-2xl font-semibold tracking-tight">Recursos pensados para PMEs</h2>
              <p className="mt-2 text-muted-foreground">
                Tudo que você precisa para vender e atender no WhatsApp com consistência.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              {[
                {
                  Icon: Bot,
                  title: "Chatbots",
                  description: "Fluxos inteligentes para responder na hora com consistência.",
                },
                {
                  Icon: MessageSquare,
                  title: "Campanhas",
                  description: "Envio em massa com segmentação, controle e governança.",
                },
                {
                  Icon: BarChart,
                  title: "Relatórios",
                  description: "Métricas para melhorar conversão, atendimento e retenção.",
                },
              ].map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={prefersReducedMotion ? undefined : { opacity: 0, y: 50 }}
                  whileInView={prefersReducedMotion ? undefined : { opacity: 1, y: 0 }}
                  transition={
                    prefersReducedMotion
                      ? undefined
                      : {
                          duration: 0.5,
                          delay: index * 0.1,
                          ease: "easeOut",
                        }
                  }
                  viewport={{ once: true, margin: "-100px" }}
                >
                  <FeatureCard {...feature} />
                </motion.div>
              ))}
            </div>
          </div>
        </RevealSection>

        <React.Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-20" /> }>
          <TestimonialsSection />
        </React.Suspense>

        <RevealSection id="precos" className="border-t bg-background">
          <React.Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-20" /> }>
            <PricingSection />
          </React.Suspense>
        </RevealSection>

        <RevealSection className="border-t bg-background">
          <React.Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-20" /> }>
            <LandingFaqSection />
          </React.Suspense>
        </RevealSection>

        <RevealSection className="border-t">
          <React.Suspense fallback={<div className="mx-auto max-w-7xl px-4 py-20" /> }>
            <FinalEpicCta ctaTo={user ? "/dashboard/inicio" : "/cadastro"} />
          </React.Suspense>
        </RevealSection>
      </main>

      {/* Back to top */}
      <AnimatePresence>
        {scrolled && (
          <motion.button
            type="button"
            aria-label="Voltar ao topo"
            className="fixed bottom-8 right-8 z-50 grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg"
            initial={prefersReducedMotion ? undefined : { scale: 0, rotate: -180 }}
            animate={prefersReducedMotion ? undefined : { scale: 1, rotate: 0 }}
            exit={prefersReducedMotion ? undefined : { scale: 0, rotate: 180 }}
            whileHover={prefersReducedMotion ? undefined : { scale: 1.1 }}
            whileTap={prefersReducedMotion ? undefined : { scale: 0.9 }}
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            <ArrowUp size={24} />
          </motion.button>
        )}
      </AnimatePresence>

      <LandingFooter />
    </div>
  );
};

export default Index;
