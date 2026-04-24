import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthCardLayout } from "@/components/auth/AuthCardLayout";
import { PasswordStrength } from "@/components/auth/PasswordStrength";
import { useToast } from "@/hooks/use-toast";
import { authClient } from "@/integrations/supabase/client";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { z } from "zod";
import { passwordPolicySchema } from "@/lib/password-policy";

const schema = z
  .object({
    password: passwordPolicySchema(),
    confirmPassword: z.string().min(8).max(72),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export default function RedefinirSenha() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [ready, setReady] = React.useState(false);

  // Better Auth envia o token como query param: ?token=xxx
  const token = searchParams.get("token");

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  React.useEffect(() => {
    if (!token) {
      toast({
        title: "Link inválido ou expirado",
        description: "Abra o link mais recente enviado por email para redefinir sua senha.",
        variant: "destructive",
      });
    }
    setReady(true);
  }, [token, toast]);

  const onSubmit = async (values: FormValues) => {
    if (!token) {
      toast({
        title: "Token não encontrado",
        description: "Peça um novo link de recuperação e tente novamente.",
        variant: "destructive",
      });
      return;
    }

    const { error } = await authClient.resetPassword({
      newPassword: values.password,
      token,
    });

    if (error) {
      toast({ title: "Não foi possível redefinir", description: error.message, variant: "destructive" });
      return;
    }

    await authClient.signOut();
    navigate("/login", {
      replace: true,
      state: { toast: { title: "Senha alterada com sucesso!", description: "Faça login com sua nova senha." } },
    });
  };

  return (
    <AuthCardLayout title="Criar Nova Senha" subtitle="Defina uma nova senha para sua conta">
      {!ready ? (
        <div className="grid place-items-center py-10 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
          <div className="space-y-2">
            <label className="text-sm font-medium">Nova Senha</label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
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
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <PasswordStrength password={form.watch("password") ?? ""} />
            {form.formState.errors.password && (
              <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Confirmar Senha</label>
            <div className="relative">
              <Input
                type={showConfirm ? "text" : "password"}
                placeholder="••••••••"
                className="pr-10"
                {...form.register("confirmPassword")}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowConfirm((v) => !v)}
              >
                {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {form.formState.errors.confirmPassword && (
              <p className="text-xs text-destructive">{form.formState.errors.confirmPassword.message}</p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full bg-brand-primary-light text-primary-foreground hover:bg-brand-primary-light/90"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Redefinir Senha
          </Button>

          <div className="text-center text-sm">
            <Link className="text-brand-primary-light underline-offset-4 hover:underline" to="/login">
              Voltar para login
            </Link>
          </div>
        </form>
      )}
    </AuthCardLayout>
  );
}
