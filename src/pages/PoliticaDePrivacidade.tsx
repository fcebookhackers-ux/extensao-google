import { LandingFooter } from "@/components/landing/LandingFooter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Shield } from "lucide-react";
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

export default function PoliticaDePrivacidade() {
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
                <h1 className="text-2xl font-semibold tracking-tight">Política de Privacidade</h1>
                <Badge variant="outline">ZapFllow</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Como coletamos, usamos e protegemos seus dados — em conformidade com a LGPD.
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
              Esta Política descreve como a ZapFllow trata dados pessoais ao fornecer a Plataforma. Ao usar a ZapFllow, você concorda com
              as práticas descritas aqui.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button asChild className="bg-brand-primary-light text-primary-foreground hover:bg-brand-primary-mid">
                <a href="#dados-coletados">Dados coletados</a>
              </Button>
              <Button asChild className="bg-brand-primary-light text-primary-foreground hover:bg-brand-primary-mid">
                <a href="#finalidades">Finalidades</a>
              </Button>
              <Button asChild className="bg-brand-primary-light text-primary-foreground hover:bg-brand-primary-mid">
                <a href="#direitos">Direitos (LGPD)</a>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Política</CardTitle>
            <CardDescription>Transparência, segurança e controle</CardDescription>
          </CardHeader>
          <CardContent className="space-y-8">
            <Section id="controlador" title="1. Quem somos e papéis (Controlador/Operador)">
              <p>
                <strong>Controlador</strong>: a empresa responsável por definir as finalidades e meios do tratamento dos dados pessoais.
              </p>
              <p>
                <strong>Operador</strong>: quem trata dados em nome do Controlador.
              </p>
              <p>
                Em geral, a ZapFllow atua como <strong>Operadora</strong> para os dados dos seus clientes/contatos inseridos na Plataforma e
                como <strong>Controladora</strong> para dados necessários para operação da conta (ex.: cadastro, cobrança, suporte).
              </p>
            </Section>

            <Separator />

            <Section id="dados-coletados" title="2. Quais dados coletamos">
              <ul className="list-disc space-y-2 pl-5">
                <li>
                  <strong>Dados de conta</strong>: nome, email, telefone, empresa, preferências e informações de login.
                </li>
                <li>
                  <strong>Dados de uso</strong>: páginas acessadas, eventos, logs técnicos, data/hora e endereço IP (quando aplicável).
                </li>
                <li>
                  <strong>Conteúdo do Usuário</strong>: contatos, etiquetas, mensagens, templates, automações e arquivos que você envia.
                </li>
                <li>
                  <strong>Dados de pagamento</strong>: status da assinatura e histórico (dados sensíveis de cartão normalmente ficam com o
                  provedor de pagamento).
                </li>
              </ul>
            </Section>

            <Separator />

            <Section id="finalidades" title="3. Para que usamos seus dados">
              <ul className="list-disc space-y-2 pl-5">
                <li>Prestar e manter a Plataforma (autenticação, suporte, melhorias, segurança).</li>
                <li>Configurar e executar automações e integrações solicitadas por você.</li>
                <li>Prevenir fraudes, abusos e incidentes de segurança.</li>
                <li>Comunicações operacionais (ex.: avisos de manutenção, alterações relevantes).</li>
                <li>Comunicações de marketing (apenas quando houver base legal/consentimento, quando aplicável).</li>
              </ul>
            </Section>

            <Separator />

            <Section id="bases-legais" title="4. Bases legais (LGPD)">
              <p>
                O tratamento pode ocorrer com base em: execução de contrato, cumprimento de obrigação legal/regulatória, legítimo interesse
                (com avaliação), e consentimento quando necessário.
              </p>
            </Section>

            <Separator />

            <Section id="compartilhamento" title="5. Compartilhamento com terceiros">
              <p>
                Podemos compartilhar dados com provedores essenciais (ex.: hospedagem, envio de emails, analytics, pagamentos) estritamente
                para operar a Plataforma.
              </p>
              <p>
                Integrações de terceiros (ex.: WhatsApp/Meta) podem envolver tratamento sob regras próprias. Você é responsável por
                configurar e habilitar apenas integrações autorizadas.
              </p>
            </Section>

            <Separator />

            <Section id="cookies" title="6. Cookies e tecnologias similares">
              <p>
                Usamos cookies/armazenamento local para autenticação, preferências e segurança. Cookies analíticos/marketing (se usados)
                devem respeitar suas escolhas de consentimento.
              </p>
            </Section>

            <Separator />

            <Section id="seguranca" title="7. Segurança">
              <p>
                Adotamos medidas técnicas e organizacionais para proteger dados, incluindo controles de acesso, criptografia em trânsito
                (HTTPS) e boas práticas de desenvolvimento.
              </p>
              <p>
                Nenhum sistema é 100% seguro; por isso, recomendamos senhas fortes e gestão de acessos de equipe.
              </p>
            </Section>

            <Separator />

            <Section id="retencao" title="8. Retenção e exclusão">
              <p>
                Mantemos dados pelo tempo necessário para cumprir as finalidades, obrigações legais e exercício regular de direitos.
              </p>
              <p>
                Após o encerramento da conta, podemos reter dados por períodos razoáveis/legais e excluir/anonimizar quando aplicável.
              </p>
            </Section>

            <Separator />

            <Section id="direitos" title="9. Direitos do titular (LGPD)">
              <p>Você pode solicitar:</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>Confirmação e acesso aos dados;</li>
                <li>Correção de dados incompletos, inexatos ou desatualizados;</li>
                <li>Anonimização, bloqueio ou eliminação (quando aplicável);</li>
                <li>Portabilidade (quando aplicável);</li>
                <li>Informações sobre compartilhamento;</li>
                <li>Revogação do consentimento (quando aplicável).</li>
              </ul>
            </Section>

            <Separator />

            <Section id="encarregado" title="10. Encarregado (DPO) e contato">
              <p>
                Para solicitações de privacidade e LGPD, contate: <strong>dpo@zapfllow.com</strong> (substitua pelo email oficial).
              </p>
            </Section>

            <Separator />

            <Section id="alteracoes" title="11. Alterações desta Política">
              <p>
                Podemos atualizar esta Política para refletir melhorias e mudanças legais/técnicas. Quando relevante, comunicaremos no
                produto ou por email.
              </p>
            </Section>
          </CardContent>
        </Card>
      </main>

      <LandingFooter />
    </div>
  );
}
