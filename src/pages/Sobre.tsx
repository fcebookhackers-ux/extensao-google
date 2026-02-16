import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RevealSection } from "@/components/motion/RevealSection";
import { LandingFooter } from "@/components/landing/LandingFooter";
import { Award, Shield, Target, TrendingUp, Users, Zap } from "lucide-react";
import { Link } from "react-router-dom";

export default function Sobre() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-gradient-to-br from-background via-background to-primary/5">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <Badge className="mb-4 bg-primary/10 text-primary hover:bg-primary/20">Sobre a ZapFllow</Badge>
          <h1 className="mb-5 bg-gradient-to-r from-brand-primary-deep to-brand-primary-light bg-clip-text text-4xl font-bold text-transparent sm:text-5xl">
            Automatize seu WhatsApp e venda mais
          </h1>
          <p className="max-w-3xl text-base text-muted-foreground sm:text-lg">
            A ZapFllow é uma plataforma brasileira para automatizar atendimentos, campanhas e fluxos no
            WhatsApp, com foco em performance, segurança e conformidade.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-start">
            <Button asChild size="lg">
              <Link to="/cadastro">Começar grátis por 7 dias</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/">Ver a página inicial</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        <RevealSection className="mx-auto max-w-6xl px-4 py-14">
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5">
              <CardHeader>
                <div className="mb-3 inline-flex rounded-xl bg-primary/10 p-3">
                  <Target className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Nossa missão</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Democratizar a automação de WhatsApp para que empresas ganhem agilidade, organização e
                  conversão no atendimento.
                </p>
              </CardContent>
            </Card>

            <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5">
              <CardHeader>
                <div className="mb-3 inline-flex rounded-xl bg-primary/10 p-3">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Nossa visão</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Ser a plataforma mais confiável para operações de WhatsApp na América Latina,
                  entregando escala sem perder o toque humano.
                </p>
              </CardContent>
            </Card>

            <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5">
              <CardHeader>
                <div className="mb-3 inline-flex rounded-xl bg-primary/10 p-3">
                  <Award className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Nossos valores</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" />
                    <span>Inovação com simplicidade</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" />
                    <span>Transparência e ética</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-2 h-1.5 w-1.5 rounded-full bg-primary" />
                    <span>Segurança e conformidade</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </RevealSection>

        <RevealSection className="border-y bg-muted/30 px-4 py-14">
          <div className="mx-auto max-w-4xl">
            <h2 className="mb-6 text-3xl font-bold">Nossa história</h2>
            <div className="space-y-5 text-muted-foreground">
              <p>
                A ZapFllow nasceu ao observar um problema comum: empresas com alto volume de mensagens
                no WhatsApp perdem tempo, padrão e oportunidades quando o atendimento não escala.
              </p>
              <p>
                Criamos uma plataforma que combina automações, templates e organização de contatos para
                equipes que precisam crescer com consistência — e medir resultados com relatórios.
              </p>
              <p>
                Nosso foco é permitir que você automatize o que é repetitivo, mantenha a qualidade do
                atendimento e acelere vendas.
              </p>
            </div>
          </div>
        </RevealSection>

        <RevealSection className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="mb-8 text-3xl font-bold">Por que a ZapFllow?</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                Icon: Shield,
                title: "Seguro e conforme",
                description: "SSL e práticas alinhadas à LGPD para operar com mais confiança.",
              },
              {
                Icon: Zap,
                title: "Automação na prática",
                description: "Crie fluxos e regras sem complicação para responder mais rápido.",
              },
              {
                Icon: Users,
                title: "Para equipes",
                description: "Organize atendimentos e processos para não perder conversas importantes.",
              },
            ].map(({ Icon, title, description }) => (
              <Card key={title} className="border-primary/10">
                <CardHeader>
                  <div className="mb-3 inline-flex rounded-xl bg-primary/10 p-3">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="text-lg">{title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </RevealSection>
      </main>

      <LandingFooter />
    </div>
  );
}
