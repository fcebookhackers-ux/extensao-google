import * as React from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { AuthCardLayout } from "@/components/auth/AuthCardLayout";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { enforceRateLimit, formatResetTime } from "@/lib/rate-limiter";
import { RateLimitError } from "@/types/rate-limit";
import { useAuth } from "@/providers/AuthProvider";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2, Mail } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { z } from "zod";

const schema = z.object({
  email: z.string().trim().email("Email inválido").max(255),
  password: z.string().min(8, "Mínimo de 8 caracteres").max(72),
  remember: z.boolean().default(true),
});

type FormValues = z.infer<typeof schema>;

export default function Login() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const [showPassword, setShowPassword] = React.useState(false);
  const [oauthLoading, setOauthLoading] = React.useState(false);

  const from = (location.state as { from?: string } | null)?.from;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "", remember: true },
  });

  useEffect(() => {
    if (user) navigate("/dashboard/inicio", { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    const msg = (location.state as { toast?: { title: string; description?: string } } | null)?.toast;
    if (msg) toast(msg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSubmit = async (values: FormValues) => {
    try {
      await enforceRateLimit("auth.login");
    } catch (err) {
      if (err instanceof RateLimitError) {
        toast({
          title: "Muitas tentativas",
          description: `Aguarde ${formatResetTime(err.resetAt)} e tente novamente.`,
          variant: "destructive",
        });
        return;
      }
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.password,
    });

    if (error) {
      toast({
        title: "Email ou senha incorretos",
        description: "Verifique seus dados e tente novamente.",
        variant: "destructive",
      });
      return;
    }

    navigate(from ?? "/dashboard/inicio", { replace: true });
  };

  const onGoogle = async () => {
    setOauthLoading(true);
    const redirectTo = `${window.location.origin}/dashboard/inicio`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    setOauthLoading(false);
    if (error) {
      toast({ title: "Falha no Google", description: error.message, variant: "destructive" });
    }
  };

  return (
    <AuthCardLayout title="Entrar na sua conta" subtitle="Bem-vindo de volta!">
      <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
        <div className="space-y-2">
          <label className="text-sm font-medium">Email</label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoComplete="email"
              inputMode="email"
              placeholder="seu@email.com"
              className="pl-9"
              {...form.register("email")}
            />
          </div>
          {form.formState.errors.email && (
            <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Senha</label>
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              className="pr-10"
              {...form.register("password")}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Use letras, números e caracteres especiais.
          </p>
          {form.formState.errors.password && (
            <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
          )}
        </div>

        <div className="flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <Checkbox checked={form.watch("remember")} onCheckedChange={(v) => form.setValue("remember", !!v)} />
            Lembrar-me por 30 dias
          </label>
          <Link className="text-sm text-primary underline-offset-4 hover:underline" to="/recuperar-senha">
            Esqueceu a senha?
          </Link>
        </div>

        <Button
          className="w-full bg-brand-primary-light text-primary-foreground hover:bg-brand-primary-light/90"
          type="submit"
          disabled={form.formState.isSubmitting}
        >
          {form.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Entrar
        </Button>

        <div className="relative">
          <Separator />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
            ou
          </span>
        </div>

        <GoogleAuthButton onClick={onGoogle} loading={oauthLoading} label="Continuar com Google" />

        <p className="text-center text-sm text-muted-foreground">
          Não tem conta?{" "}
          <Link className="text-brand-primary-light underline-offset-4 hover:underline" to="/cadastro">
            Cadastre-se
          </Link>
        </p>
      </form>
    </AuthCardLayout>
  );
}
