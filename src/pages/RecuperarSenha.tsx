import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthCardLayout } from "@/components/auth/AuthCardLayout";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { enforceRateLimit, formatResetTime } from "@/lib/rate-limiter";
import { RateLimitError } from "@/types/rate-limit";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link } from "react-router-dom";
import { z } from "zod";

const schema = z.object({
  email: z.string().trim().email("Informe um e-mail válido").max(255),
});

type FormValues = z.infer<typeof schema>;

export default function RecuperarSenha() {
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (values: FormValues) => {
    try {
      await enforceRateLimit("auth.password_reset");
    } catch (err) {
      if (err instanceof RateLimitError) {
        toast({
          title: "Muitas solicitações",
          description: `Aguarde ${formatResetTime(err.resetAt)} e tente novamente.`,
          variant: "destructive",
        });
        return;
      }
    }

    const redirectTo = `${window.location.origin}/redefinir-senha`;
    const { error } = await supabase.auth.resetPasswordForEmail(values.email, { redirectTo });

    if (error) {
      toast({ title: "Não foi possível enviar", description: error.message, variant: "destructive" });
      return;
    }

    toast({ title: "E-mail enviado", description: "Se existir uma conta, você receberá instruções em instantes." });
  };

  return (
    <AuthCardLayout title="Esqueceu sua senha?" subtitle="Enviaremos um link de recuperação para seu email">
      <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="space-y-2">
          <label className="text-sm font-medium">Email</label>
          <Input autoComplete="email" inputMode="email" placeholder="seu@email.com" {...form.register("email")} />
          {form.formState.errors.email && (
            <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
          )}
        </div>

        <Button
          className="w-full bg-brand-primary-light text-primary-foreground hover:bg-brand-primary-light/90"
          type="submit"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Enviar Link de Recuperação
        </Button>

        <div className="text-center text-sm">
          <Link className="text-brand-primary-light underline-offset-4 hover:underline" to="/login">
            Voltar para login
          </Link>
        </div>
      </form>
    </AuthCardLayout>
  );
}

