import { LandingFooter } from "@/components/landing/LandingFooter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Shield, Lock, Eye, Server, AlertTriangle, CheckCircle2 } from "lucide-react";
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

export default function Seguranca() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-6">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-md bg-muted">
              <Shield className="h-5 w-5 text-foreground" />
            </span>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">Segurança</h1>
                <Badge variant="outline">ZapFllow</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Como protegemos seus dados e garantimos a segurança da Plataforma.
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
              Versão: 1.0 • Vigência: 28/01/2026 • Modelo informativo: revise com seu time de segurança antes de publicar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              A segurança é uma prioridade na ZapFllow. Esta página descreve as medidas técnicas e organizacionais que adotamos para
              proteger seus dados, prevenir incidentes e garantir a disponibilidade da Plataforma.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild className="bg-brand-primary-light text-primary-foreground hover:bg-brand-primary-mid">
                <a href="#infraestrutura">Infraestrutura</a>
              </Button>
              <Button asChild className="bg-brand-primary-light text-primary-foreground hover:bg-brand-primary-mid">
                <a href="#acesso">Controle de acesso</a>
              </Button>
              <Button asChild className="bg-brand-primary-light text-primary-foreground hover:bg-brand-primary-mid">
                <a href="#criptografia">Criptografia</a>
              </Button>
              <Button asChild className="bg-brand-primary-light text-primary-foreground hover:bg-brand-primary-mid">
                <a href="#reportar">Reportar vulnerabilidades</a>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Status Cards */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-brand-primary-light" />
                <CardTitle className="text-lg">Status Operacional</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <Badge className="bg-brand-primary-light text-primary-foreground hover:bg-brand-primary-light">
                Todos os sistemas online
              </Badge>
              <p className="mt-2 text-xs text-muted-foreground">
                Última atualização: Hoje às 12:00
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-brand-primary-light" />
                <CardTitle className="text-lg">Certificações</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Badge variant="outline">SSL/TLS</Badge>
                <Badge variant="outline">LGPD</Badge>
                <Badge variant="outline">ISO 27001*</Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                *Em processo de certificação
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Server className="h-5 w-5 text-brand-primary-light" />
                <CardTitle className="text-lg">Uptime</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-semibold text-foreground">99.9%</p>
              <p className="text-xs text-muted-foreground">
                Últimos 30 dias
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Medidas de Segurança</CardTitle>
            <CardDescription>Como protegemos a Plataforma e seus dados</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <Section id="infraestrutura" title="1. Infraestrutura e hospedagem">
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong>Provedores confiáveis</strong>: hospedagem em infraestrutura de nível empresarial (AWS, Google Cloud, ou
                  equivalente) com conformidade SOC 2, ISO 27001 e outras certificações.
                </li>
                <li>
                  <strong>Redundância e backup</strong>: backups automáticos diários, armazenamento distribuído e planos de recuperação de
                  desastres.
                </li>
                <li>
                  <strong>Monitoramento contínuo</strong>: alertas em tempo real para anomalias, indisponibilidade e tentativas de acesso
                  não autorizado.
                </li>
                <li>
                  <strong>Firewall e proteção DDoS</strong>: filtragem de tráfego malicioso e mitigação de ataques de negação de serviço.
                </li>
              </ul>
            </Section>

            <Separator />

            <Section id="acesso" title="2. Controle de acesso e autenticação">
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong>Autenticação robusta</strong>: suporte a autenticação via email/senha com hash bcrypt/argon2, OAuth (Google, etc.)
                  e autenticação multifator (MFA/2FA) quando aplicável.
                </li>
                <li>
                  <strong>Controle de permissões (RBAC)</strong>: papéis e permissões granulares para limitar acesso a recursos sensíveis.
                </li>
                <li>
                  <strong>Sessões seguras</strong>: tokens JWT com expiração, renovação automática e revogação imediata quando necessário.
                </li>
                <li>
                  <strong>Logs de auditoria</strong>: registro de acessos, alterações críticas e tentativas de login para investigação e
                  conformidade.
                </li>
              </ul>
            </Section>

            <Separator />

            <Section id="criptografia" title="3. Criptografia e proteção de dados">
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong>Criptografia em trânsito</strong>: todas as comunicações usam HTTPS/TLS 1.2+ para proteger dados em transmissão.
                </li>
                <li>
                  <strong>Criptografia em repouso</strong>: dados sensíveis (senhas, tokens) são armazenados com hash/criptografia forte
                  (AES-256 ou superior).
                </li>
                <li>
                  <strong>Gestão de chaves</strong>: chaves criptográficas gerenciadas com segurança e rotação periódica.
                </li>
                <li>
                  <strong>Política de retenção</strong>: dados desnecessários ou solicitados para exclusão são anonimizados/eliminados
                  conforme políticas internas e LGPD.
                </li>
              </ul>
            </Section>

            <Separator />

            <Section id="desenvolvimento" title="4. Práticas de desenvolvimento seguro">
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong>Revisão de código</strong>: code review obrigatório, análise estática (SAST) e testes automatizados antes de
                  deploy.
                </li>
                <li>
                  <strong>Gestão de dependências</strong>: escaneamento de vulnerabilidades em bibliotecas e atualização regular.
                </li>
                <li>
                  <strong>Validação de entrada</strong>: proteção contra SQL injection, XSS, CSRF e outras vulnerabilidades OWASP Top 10.
                </li>
                <li>
                  <strong>Testes de segurança</strong>: testes de penetração (pentests) e auditorias de segurança periódicas.
                </li>
              </ul>
            </Section>

            <Separator />

            <Section id="incidentes" title="5. Resposta a incidentes">
              <p>
                Mantemos um plano de resposta a incidentes para identificar, conter e mitigar rapidamente qualquer evento de segurança:
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li>Detecção e alerta: monitoramento 24/7 com alertas automatizados.</li>
                <li>Contenção: isolamento imediato de sistemas comprometidos.</li>
                <li>Investigação: análise forense para identificar causa raiz e extensão do incidente.</li>
                <li>Comunicação: notificação aos afetados e autoridades conforme exigências legais (LGPD, etc.).</li>
                <li>Remediação: correção de vulnerabilidades e melhorias contínuas.</li>
              </ul>
            </Section>

            <Separator />

            <Section id="compliance" title="6. Conformidade e governança">
              <p>
                A ZapFllow segue frameworks e padrões reconhecidos de segurança e privacidade:
              </p>
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong>LGPD</strong>: conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).
                </li>
                <li>
                  <strong>OWASP Top 10</strong>: mitigação contínua das principais vulnerabilidades de aplicações web.
                </li>
                <li>
                  <strong>ISO 27001*</strong>: processo de certificação em andamento (sistema de gestão de segurança da informação).
                </li>
                <li>
                  <strong>SOC 2*</strong>: auditoria de controles organizacionais e técnicos (em planejamento).
                </li>
              </ul>
            </Section>

            <Separator />

            <Section id="equipe" title="7. Treinamento e cultura de segurança">
              <p>
                Investimos em capacitação contínua da equipe sobre boas práticas de segurança, privacidade e resposta a incidentes. Todos
                os colaboradores passam por treinamento obrigatório ao ingressar e reciclagem periódica.
              </p>
            </Section>

            <Separator />

            <Section id="reportar" title="8. Programa de divulgação responsável de vulnerabilidades">
              <p>
                Encorajamos pesquisadores de segurança e usuários a reportar vulnerabilidades de forma responsável. Caso identifique uma
                falha de segurança:
              </p>
              <div className="rounded-lg border bg-muted/40 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-foreground">Como reportar uma vulnerabilidade</p>
                    <ul className="list-disc space-y-1 pl-5 text-sm">
                      <li>
                        Envie um email para: <strong>security@zapfllow.com</strong> (substitua pelo email oficial)
                      </li>
                      <li>Inclua uma descrição detalhada da vulnerabilidade e passos para reproduzi-la</li>
                      <li>Aguarde nossa resposta (prazo de 72h úteis para primeira resposta)</li>
                      <li>
                        <strong>Não divulgue publicamente</strong> a vulnerabilidade antes de nossa confirmação e correção
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
              <p className="mt-3">
                Valorizamos contribuições responsáveis e reconhecemos pesquisadores em nosso Hall da Fama de Segurança (quando aplicável).
              </p>
            </Section>

            <Separator />

            <Section id="atualizacoes" title="9. Alterações desta página">
              <p>
                Podemos atualizar esta página para refletir mudanças em nossas práticas de segurança, certificações ou requisitos legais.
                Quando relevante, comunicaremos no produto ou por email.
              </p>
            </Section>
          </CardContent>
        </Card>
      </main>

      <LandingFooter />
    </div>
  );
}
