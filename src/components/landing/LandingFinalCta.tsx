import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export function LandingFinalCta({ ctaTo }: { ctaTo: string }) {
  return (
    <section className="border-t bg-brand-primary-light">
      <div className="mx-auto max-w-7xl px-4 py-16">
        <div className="grid gap-6 rounded-2xl bg-background/10 p-8 md:grid-cols-[1fr_auto] md:items-center">
          <div>
            <h2 className="text-balance text-3xl font-semibold tracking-tight text-primary-foreground">
              Pronto para o ZapFllow?
            </h2>
            <p className="mt-2 text-primary-foreground/90">Junte-se a 500+ empresas que já vendem no automático</p>
          </div>

          <Button
            asChild
            size="lg"
            className="bg-background text-brand-primary-light hover:bg-background/90"
          >
            <Link to={ctaTo}>Começar Grátis Agora</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
