import { LandingFooter } from "@/components/landing/LandingFooter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, ShieldCheck } from "lucide-react";
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

export default function Lgpd() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-6">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-md bg-muted">
              <ShieldCheck className="h-5 w-5 text-foreground" />
            </span>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">LGPD — Direitos do Titular</h1>
                <Badge variant="outline">ZapFllow</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Como exercer seus direitos e como a ZapFllow lida com solicitações relacionadas a dados pessoais.
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
              A Lei Geral de Proteção de Dados (LGPD — Lei nº 13.709/2018) garante direitos aos titulares de dados pessoais. Esta página
              explica como você pode solicitar o exercício desses direitos e como tratamos essas solicitações.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild className="bg-brand-primary-light text-primary-foreground hover:bg-brand-primary-mid">
                <a href="#direitos">Direitos</a>
              </Button>
              <Button asChild className="bg-brand-primary-light text-primary-foreground hover:bg-brand-primary-mid">
                <a href="#como-solicitar">Como solicitar</a>
              </Button>
              <Button asChild className="bg-brand-primary-light text-primary-foreground hover:bg-brand-primary-mid">
                <a href="#prazos">Prazos</a>
              </Button>
              <Button asChild className="bg-brand-primary-light text-primary-foreground hover:bg-brand-primary-mid">
                <a href="#contato">Contato</a>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>LGPD</CardTitle>
            <CardDescription>Transparência e controle sobre seus dados</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <Section id="direitos" title="1. Quais são seus direitos (art. 18 da LGPD)">
              <p>Você pode solicitar, quando aplicável:</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong>Confirmação</strong> da existência de tratamento;
                </li>
                <li>
                  <strong>Acesso</strong> aos dados;
                </li>
                <li>
                  <strong>Correção</strong> de dados incompletos, inexatos ou desatualizados;
                </li>
                <li>
                  <strong>Anonimização, bloqueio ou eliminação</strong> de dados desnecessários/excessivos ou tratados em desconformidade;
                </li>
                <li>
                  <strong>Portabilidade</strong> (nos termos da regulamentação, quando aplicável);
                </li>
                <li>
                  <strong>Eliminação</strong> de dados tratados com consentimento, quando cabível;
                </li>
                <li>
                  <strong>Informação</strong> sobre compartilhamento com terceiros;
                </li>
                <li>
                  <strong>Informação</strong> sobre a possibilidade de não fornecer consentimento e consequências;
                </li>
                <li>
                  <strong>Revogação</strong> do consentimento.
                </li>
              </ul>
            </Section>

            <Separator />

            <Section id="papel" title="2. Papéis (Controlador/Operador) e escopo">
              <p>
                Em geral, a ZapFllow pode atuar como <strong>Controladora</strong> para dados relacionados à sua conta (cadastro, cobrança,
                suporte) e como <strong>Operadora</strong> para dados que você insere na Plataforma (ex.: contatos e mensagens), tratando-os
                conforme suas instruções.
              </p>
              <p>
                Por isso, algumas solicitações podem depender da relação entre você (cliente) e seus próprios titulares (seus contatos),
                especialmente quando você é o Controlador dos dados.
              </p>
            </Section>

            <Separator />

            <Section id="como-solicitar" title="3. Como solicitar o exercício de direitos">
              <p>
                Envie uma solicitação para o canal de privacidade informando: (i) qual direito deseja exercer; (ii) qual conta/empresa está
                relacionada; (iii) dados de identificação para validação; e (iv) detalhes do pedido.
              </p>
              <div className="rounded-lg border bg-muted/40 p-4">
                <p className="text-sm text-foreground">
                  Canal recomendado: <strong>dpo@zapfllow.com</strong> (substitua pelo email oficial)
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Para sua segurança, podemos solicitar informações adicionais para confirmar sua identidade e prevenir fraudes.
                </p>
              </div>
              <p>
                Observação: se você estiver solicitando dados relacionados a um negócio/empresa (conta corporativa), podemos exigir que o
                solicitante comprove vínculo e autorização.
              </p>
            </Section>

            <Separator />

            <Section id="prazos" title="4. Prazos e fluxo de atendimento">
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong>Recebimento</strong>: confirmamos o recebimento e, se necessário, pedimos complementos para validação.
                </li>
                <li>
                  <strong>Análise</strong>: avaliamos a base legal, o escopo e a viabilidade técnica/jurídica do atendimento.
                </li>
                <li>
                  <strong>Resposta</strong>: respondemos dentro de prazos razoáveis e/ou conforme exigência regulatória.
                </li>
              </ul>
              <p>
                Alguns pedidos podem ser limitados por obrigação legal, necessidade de retenção (ex.: fiscal/contábil) ou exercício regular
                de direitos.
              </p>
            </Section>

            <Separator />

            <Section id="seguranca" title="5. Segurança e prevenção a fraudes">
              <p>
                Protegemos dados com medidas técnicas e organizacionais (ex.: controle de acesso, logs, criptografia em trânsito). Para
                evitar fraudes, podemos negar ou solicitar comprovações adicionais em pedidos suspeitos.
              </p>
            </Section>

            <Separator />

            <Section id="autoridade" title="6. Autoridade Nacional (ANPD)">
              <p>
                Se você entender que sua solicitação não foi atendida adequadamente, você pode buscar orientação junto à Autoridade Nacional
                de Proteção de Dados (ANPD), sem prejuízo de outros direitos.
              </p>
            </Section>

            <Separator />

            <Section id="contato" title="7. Encarregado (DPO) e contato">
              <p>
                Para solicitações de privacidade/LGPD, contate: <strong>dpo@zapfllow.com</strong> (substitua pelo email oficial).
              </p>
            </Section>
          </CardContent>
        </Card>
      </main>

      <LandingFooter />
    </div>
  );
}
