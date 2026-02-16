import { LandingFooter } from "@/components/landing/LandingFooter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Cookie } from "lucide-react";
import * as React from "react";
import { Link } from "react-router-dom";

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 space-y-3">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <div className="space-y-3 text-sm text-muted-foreground">{children}</div>
    </section>
  );
}

export default function PoliticaDeCookies() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-6">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-md bg-muted">
              <Cookie className="h-5 w-5 text-foreground" />
            </span>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">Política de Cookies</h1>
                <Badge variant="outline">ZapFllow</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Entenda como usamos cookies e tecnologias similares para melhorar sua experiência — em conformidade com a LGPD.
              </p>
            </div>
          </div>

          <Button asChild variant="outline">
            <Link to="/">
              <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-4 py-10">
        <Card>
          <CardHeader>
            <CardTitle>Resumo</CardTitle>
            <CardDescription>
              Versão: 1.0 • Vigência: 28/01/2026 • Modelo informativo: revise com seu jurídico/DPO antes de publicar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              Esta Política explica o que são cookies, quais tipos podem ser utilizados na ZapFllow, para quais finalidades e como você
              pode gerenciar suas preferências.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild className="bg-brand-primary-light text-primary-foreground hover:bg-brand-primary-mid">
                <a href="#o-que-sao">O que são</a>
              </Button>
              <Button asChild className="bg-brand-primary-light text-primary-foreground hover:bg-brand-primary-mid">
                <a href="#categorias">Categorias</a>
              </Button>
              <Button asChild className="bg-brand-primary-light text-primary-foreground hover:bg-brand-primary-mid">
                <a href="#gerenciar">Como gerenciar</a>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Política</CardTitle>
            <CardDescription>Transparência, escolha e segurança</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <Section id="o-que-sao" title="1. O que são cookies e tecnologias similares">
              <p>
                Cookies são pequenos arquivos armazenados no seu dispositivo quando você visita um site/aplicação. Eles ajudam a lembrar
                preferências, manter sessões autenticadas e compreender como a Plataforma é utilizada.
              </p>
              <p>
                Também podemos usar tecnologias similares (ex.: armazenamento local, SDKs, pixels e identificadores) com finalidades
                equivalentes.
              </p>
            </Section>

            <Separator />

            <Section id="por-que-usamos" title="2. Por que usamos cookies">
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong>Operação</strong>: autenticação, segurança, prevenção de fraude e funcionamento de recursos essenciais.
                </li>
                <li>
                  <strong>Preferências</strong>: lembrar idioma, fuso, escolhas e configurações do usuário.
                </li>
                <li>
                  <strong>Medição e melhoria</strong>: entender desempenho e usabilidade para evoluir a experiência.
                </li>
                <li>
                  <strong>Marketing</strong> (quando aplicável): medir campanhas e personalizar comunicações com base legal/consentimento.
                </li>
              </ul>
            </Section>

            <Separator />

            <Section id="categorias" title="3. Categorias de cookies">
              <div className="space-y-3">
                <p>
                  Abaixo estão categorias comuns. A ZapFllow pode usar uma ou mais delas, conforme sua configuração e recursos habilitados.
                </p>

                <div className="grid gap-4 md:grid-cols-2">
                  <Card className="shadow-none">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Estritamente necessários</CardTitle>
                      <CardDescription>Essenciais para funcionar</CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      Mantêm sua sessão ativa, permitem login e protegem a Plataforma. Normalmente não podem ser desativados sem impactar o
                      uso.
                    </CardContent>
                  </Card>

                  <Card className="shadow-none">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Funcionais</CardTitle>
                      <CardDescription>Preferências e conveniência</CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      Lembram escolhas (ex.: preferências de interface) para tornar a experiência mais consistente.
                    </CardContent>
                  </Card>

                  <Card className="shadow-none">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Analíticos</CardTitle>
                      <CardDescription>Medição e melhoria</CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      Ajudam a entender como a Plataforma é usada (ex.: páginas mais acessadas) e a detectar erros de navegação.
                    </CardContent>
                  </Card>

                  <Card className="shadow-none">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg">Marketing</CardTitle>
                      <CardDescription>Campanhas e personalização</CardDescription>
                    </CardHeader>
                    <CardContent className="text-sm text-muted-foreground">
                      Podem ser usados para medir campanhas e oferecer conteúdo relevante. Quando aplicável, dependem de base legal e/ou
                      consentimento.
                    </CardContent>
                  </Card>
                </div>
              </div>
            </Section>

            <Separator />

            <Section id="terceiros" title="4. Cookies de terceiros">
              <p>
                Alguns cookies podem ser definidos por provedores terceiros (ex.: analytics, suporte, pagamentos, CDNs). Esses terceiros
                podem coletar dados conforme suas próprias políticas.
              </p>
              <p>
                Você é responsável por habilitar integrações apenas quando autorizado e por revisar os termos/políticas dos respectivos
                provedores.
              </p>
            </Section>

            <Separator />

            <Section id="gerenciar" title="5. Como gerenciar cookies">
              <p>
                Você pode gerenciar cookies de duas formas: (i) no navegador (bloquear, apagar e controlar permissões) e (ii) nas
                preferências de consentimento (quando disponíveis no produto).
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong>Navegador</strong>: consulte as configurações de privacidade para limpar cookies e bloquear terceiros.
                </li>
                <li>
                  <strong>Consentimento</strong> (se aplicável): ajuste categorias (analíticos/marketing) conforme suas escolhas.
                </li>
              </ul>
              <p>
                Observação: desativar cookies necessários pode afetar login, segurança e recursos essenciais.
              </p>
            </Section>

            <Separator />

            <Section id="bases-legais" title="6. Bases legais e LGPD">
              <p>
                Quando aplicável, o uso de cookies e tecnologias similares ocorre com base em: <strong>legítimo interesse</strong> (para
                segurança e operação), <strong>execução de contrato</strong> (prestação do serviço) e/ou <strong>consentimento</strong>
                (por exemplo, para cookies analíticos/marketing, conforme configuração e requisitos legais).
              </p>
            </Section>

            <Separator />

            <Section id="alteracoes" title="7. Alterações desta Política">
              <p>
                Podemos atualizar esta Política para refletir mudanças técnicas, legais ou operacionais. Quando relevante, comunicaremos no
                produto ou por email.
              </p>
            </Section>

            <Separator />

            <Section id="contato" title="8. Contato">
              <p>
                Para dúvidas sobre cookies e privacidade, contate: <strong>dpo@zapfllow.com</strong> (substitua pelo email oficial).
              </p>
            </Section>
          </CardContent>
        </Card>
      </main>

      <LandingFooter />
    </div>
  );
}
