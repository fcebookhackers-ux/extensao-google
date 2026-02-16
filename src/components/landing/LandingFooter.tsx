import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Zap, Instagram, Facebook, Linkedin, Youtube } from "lucide-react";
import { Link } from "react-router-dom";

type FooterLink = { label: string; href: string; external?: boolean };

function FooterLinks({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-background">{title}</p>
      <ul className="grid gap-2">
        {links.map((l) => (
          <li key={l.label}>
            {l.external ? (
              <a
                href={l.href}
                className="text-sm text-background/70 transition-colors hover:text-brand-primary-light"
              >
                {l.label}
              </a>
            ) : (
              <a
                href={l.href}
                className="text-sm text-background/70 transition-colors hover:text-brand-primary-light"
              >
                {l.label}
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function LandingFooter() {
  return (
    <footer className="border-t bg-foreground">
      <div className="mx-auto max-w-7xl px-4 py-16">
        <div className="grid gap-10 md:grid-cols-4">
          {/* Marca */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2">
              <span className="grid h-9 w-9 place-items-center rounded-md bg-brand-primary-light text-primary-foreground">
                <Zap className="h-5 w-5" />
              </span>
              <div className="leading-tight">
                <p className="text-sm font-semibold text-background">ZapFllow</p>
                <p className="text-xs text-background/70">Automatize seu WhatsApp e venda mais</p>
              </div>
            </Link>

            <div className="flex items-center gap-2">
              {[
                { label: "Instagram", Icon: Instagram, href: "#" },
                { label: "Facebook", Icon: Facebook, href: "#" },
                { label: "LinkedIn", Icon: Linkedin, href: "#" },
                { label: "YouTube", Icon: Youtube, href: "#" },
              ].map(({ label, Icon, href }) => (
                <Button
                  key={label}
                  asChild
                  variant="ghost"
                  size="icon"
                  className="text-background/70 hover:bg-background/10 hover:text-brand-primary-light"
                >
                  <a href={href} aria-label={label}>
                    <Icon className="h-5 w-5" />
                  </a>
                </Button>
              ))}
            </div>
          </div>

          <FooterLinks
            title="Produto"
            links={[
              { label: "Recursos", href: "#recursos-principais" },
              { label: "Preços", href: "#precos" },
              { label: "Casos de Uso", href: "#segmentos" },
              { label: "Integrações", href: "#" },
              { label: "API Docs", href: "#" },
            ]}
          />

          <FooterLinks
            title="Empresa"
            links={[
              { label: "Sobre Nós", href: "/sobre" },
              { label: "Carreiras", href: "#" },
              { label: "Contato", href: "/contato" },
              { label: "Status da Plataforma", href: "#" },
            ]}
          />

          <FooterLinks
            title="Legal"
            links={[
              { label: "Termos de Uso", href: "/termos-de-uso" },
              { label: "Política de Privacidade", href: "/politica-de-privacidade" },
              { label: "Política de Cookies", href: "/politica-de-cookies" },
              { label: "LGPD", href: "/lgpd" },
              { label: "Segurança", href: "/seguranca" },
            ]}
          />
        </div>

        <div className="mt-12 border-t border-background/10 pt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-background/70">
              © 2026 ZapFllow. CNPJ 40.702.741/0001-39. Todos os direitos reservados.
            </p>

            <div className="flex items-center gap-2">
              <Badge className="bg-background/10 text-background hover:bg-background/10">SSL Seguro</Badge>
              <Badge className="bg-background/10 text-background hover:bg-background/10">LGPD Compliant</Badge>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
