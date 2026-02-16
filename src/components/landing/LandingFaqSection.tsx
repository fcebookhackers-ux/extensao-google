import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const faqs = [
  {
    q: "Preciso ter API oficial do WhatsApp?",
    a: "Não! Conectamos seu WhatsApp Business comum via QR Code. Para envios em massa acima de 1000/dia, recomendamos API oficial (te ajudamos a configurar).",
  },
  {
    q: "Meus dados estão seguros?",
    a: "Sim! Somos 100% LGPD compliant. Todos os dados são criptografados e armazenados em servidores seguros no Brasil. Você é dono dos seus dados.",
  },
  {
    q: "Posso cancelar a qualquer momento?",
    a: "Sim! Sem multas ou taxas. Cancele direto no painel com 1 clique. Seus dados ficam disponíveis por 30 dias após cancelamento.",
  },
  {
    q: "Como funciona o período de teste?",
    a: "7 dias grátis com acesso total ao plano Pro. Não pedimos cartão de crédito. Após o teste, escolha seu plano ou cancele sem custo.",
  },
  {
    q: "Tem limite de mensagens?",
    a: "Não cobramos por mensagem! Apenas por número de contatos. Envie quantas mensagens precisar dentro do seu plano.",
  },
  {
    q: "Vocês oferecem suporte em português?",
    a: "Sim! Suporte 100% em português via chat, email e WhatsApp. Planos Pro e Enterprise têm suporte prioritário.",
  },
  {
    q: "Posso integrar com outras ferramentas?",
    a: "Sim! Integramos com Google Sheets, Calendário, Stripe, Asaas, Zapier, RD Station e mais. Plano Pro+ inclui API aberta.",
  },
] as const;

export function LandingFaqSection() {
  return (
    <section id="faq" className="border-t bg-background">
      <div className="mx-auto max-w-7xl px-4 py-20">
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight">Dúvidas Frequentes</h2>
          <p className="mt-2 text-muted-foreground">Tudo o que você precisa saber antes de começar.</p>
        </div>

        <Accordion type="single" collapsible className="mx-auto max-w-3xl">
          {faqs.map((item, idx) => (
            <AccordionItem
              key={item.q}
              value={`faq-${idx}`}
              className="transition-colors hover:bg-muted/30"
            >
              <AccordionTrigger className="px-4">
                <span className="text-left">{item.q}</span>
              </AccordionTrigger>
              <AccordionContent className="px-4">
                <p className="text-sm text-muted-foreground">{item.a}</p>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
