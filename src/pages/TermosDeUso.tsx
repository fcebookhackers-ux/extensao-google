import { LandingFooter } from "@/components/landing/LandingFooter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, FileText } from "lucide-react";
import * as React from "react";
import { Link } from "react-router-dom";

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 space-y-3">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <div className="space-y-3 text-sm text-muted-foreground">{children}</div>
    </section>
  );
}

export default function TermosDeUso() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-6">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-md bg-muted">
              <FileText className="h-5 w-5 text-foreground" />
            </span>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">Termos de Uso</h1>
                <Badge variant="outline">ZapFllow</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Leia com atenção: estes termos regem o uso da plataforma ZapFllow.
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
              Versão: 1.0 • Vigência: 28/01/2026 • Este documento é um modelo informativo e deve ser revisado pelo seu jurídico.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            <p>
              Ao acessar e usar a ZapFllow, você concorda com estes Termos de Uso. Caso não concorde, não utilize a plataforma.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                asChild
                className="bg-brand-primary-light text-primary-foreground hover:bg-brand-primary-mid"
              >
                <a href="#aceite">Ir para Aceite</a>
              </Button>
              <Button
                asChild
                className="bg-brand-primary-light text-primary-foreground hover:bg-brand-primary-mid"
              >
                <a href="#pagamentos">Ir para Pagamentos</a>
              </Button>
              <Button
                asChild
                className="bg-brand-primary-light text-primary-foreground hover:bg-brand-primary-mid"
              >
                <a href="#responsabilidades">Ir para Responsabilidades</a>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Termos</CardTitle>
            <CardDescription>Definições, regras de uso, limitações e obrigações</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <Section id="definicoes" title="1. Definições">
              <p>
                <strong>Plataforma</strong>: o software ZapFllow, incluindo painel, automações, templates e demais recursos.
              </p>
              <p>
                <strong>Usuário</strong>: pessoa física ou representante de pessoa jurídica que cria conta e utiliza a Plataforma.
              </p>
              <p>
                <strong>Conteúdo</strong>: dados inseridos pelo Usuário (contatos, mensagens, templates, automações, arquivos, etc.).
              </p>
            </Section>

            <Separator />

            <Section id="aceite" title="2. Aceite e Elegibilidade">
              <p>
                Você declara ter capacidade legal para aceitar estes Termos e que as informações fornecidas no cadastro são verdadeiras e
                atualizadas.
              </p>
              <p>
                Se você usa a Plataforma em nome de uma empresa, declara possuir poderes para vinculá-la a estes Termos.
              </p>
            </Section>

            <Separator />

            <Section id="conta" title="3. Conta, Segurança e Acesso">
              <p>
                Você é responsável por manter a confidencialidade de credenciais, definir senhas fortes e restringir o acesso à sua conta.
              </p>
              <p>
                Atividades realizadas dentro da sua conta serão consideradas de sua responsabilidade, salvo prova de falha atribuível à
                ZapFllow.
              </p>
            </Section>

            <Separator />

            <Section id="uso" title="4. Uso Permitido">
              <p>
                A ZapFllow é destinada a automatizar fluxos de atendimento e comunicação, organizar contatos e facilitar operações de
                mensagens.
              </p>
              <p>
                Você se compromete a cumprir leis aplicáveis, regras de plataformas de terceiros (ex.: WhatsApp/Meta) e boas práticas de
                comunicação.
              </p>
            </Section>

            <Separator />

            <Section id="proibicoes" title="5. Condutas Proibidas">
              <ul className="list-disc space-y-2 pl-5">
                <li>Enviar spam, fraudes, phishing, conteúdo ilegal ou que viole direitos de terceiros.</li>
                <li>Tentar burlar limites de uso, segurança, autenticação ou controles técnicos da Plataforma.</li>
                <li>Copiar, desmontar, realizar engenharia reversa ou explorar vulnerabilidades.</li>
                <li>Usar a Plataforma para assediar, discriminar ou causar danos a terceiros.</li>
              </ul>
            </Section>

            <Separator />

            <Section id="planos" title="6. Planos, Limites e Recursos">
              <p>
                Os recursos disponíveis podem variar conforme o plano contratado (ex.: limites de automações, usuários, templates,
                integrações, etc.).
              </p>
              <p>
                A ZapFllow pode ajustar limites e recursos para manter a qualidade do serviço, com comunicação prévia quando aplicável.
              </p>
            </Section>

            <Separator />

            <Section id="pagamentos" title="7. Pagamentos, Renovação e Cancelamento">
              <p>
                Assinaturas, quando aplicáveis, são cobradas de forma recorrente conforme o ciclo informado no momento da contratação.
              </p>
              <p>
                Cancelamentos interrompem a renovação futura. Salvo previsão legal/contratual específica, valores já pagos não são
                reembolsáveis.
              </p>
            </Section>

            <Separator />

            <Section id="conteudo" title="8. Conteúdo do Usuário e Propriedade">
              <p>
                Você mantém a titularidade do seu Conteúdo. Ao utilizar a Plataforma, você concede à ZapFllow a permissão necessária para
                hospedar, processar e exibir o Conteúdo exclusivamente para prestar o serviço.
              </p>
              <p>
                A ZapFllow e seus licenciadores mantêm todos os direitos sobre a Plataforma, marca, layout, componentes e tecnologia.
              </p>
            </Section>

            <Separator />

            <Section id="privacidade" title="9. Privacidade e Proteção de Dados">
              <p>
                O tratamento de dados pessoais seguirá a legislação aplicável (incluindo LGPD). Para detalhes, consulte a Política de
                Privacidade.
              </p>
              <p>
                Você é responsável por garantir base legal para contato e comunicação com seus clientes/contatos e por respeitar opt-out e
                preferências de consentimento.
              </p>
            </Section>

            <Separator />

            <Section id="terceiros" title="10. Serviços de Terceiros (ex.: WhatsApp)">
              <p>
                Integrações com serviços de terceiros podem exigir aceitação de termos adicionais. A disponibilidade e o funcionamento
                desses serviços não dependem exclusivamente da ZapFllow.
              </p>
            </Section>

            <Separator />

            <Section id="responsabilidades" title="11. Responsabilidades e Limitações">
              <p>
                A Plataforma é fornecida “como está”, podendo sofrer indisponibilidades pontuais por manutenção, atualizações ou fatores
                externos.
              </p>
              <p>
                Na máxima extensão permitida por lei, a ZapFllow não se responsabiliza por lucros cessantes, perda de receita ou danos
                indiretos decorrentes do uso ou incapacidade de uso.
              </p>
            </Section>

            <Separator />

            <Section id="suspensao" title="12. Suspensão e Encerramento">
              <p>
                A ZapFllow poderá suspender ou encerrar contas em caso de violação destes Termos, risco de segurança, uso indevido ou por
                exigência legal.
              </p>
              <p>
                Você pode encerrar sua conta a qualquer momento, conforme recursos disponíveis no painel.
              </p>
            </Section>

            <Separator />

            <Section id="alteracoes" title="13. Alterações destes Termos">
              <p>
                Podemos atualizar estes Termos para refletir mudanças legais, técnicas ou comerciais. Quando relevante, avisaremos no
                produto ou por email.
              </p>
            </Section>

            <Separator />

            <Section id="contato" title="14. Contato">
              <p>
                Dúvidas sobre estes Termos: <strong>suporte@zapfllow.com</strong> (substitua pelo email oficial).
              </p>
            </Section>
          </CardContent>
        </Card>
      </main>

      <LandingFooter />
    </div>
  );
}
