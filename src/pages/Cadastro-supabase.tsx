import * as React from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { AuthCardLayout } from "@/components/auth/AuthCardLayout";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";
import { PasswordStrength } from "@/components/auth/PasswordStrength";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/providers/AuthProvider";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { z } from "zod";
import { passwordPolicySchema } from "@/lib/password-policy";

const cnpjRegex = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/;
const phoneRegex = /^\(\d{2}\)\s\d{4,5}-\d{4}$/;

const schema = z
  .object({
    fullName: z.string().trim().min(3, "Nome precisa ter no mínimo 3 caracteres").max(120),
    email: z.string().trim().email("Email inválido").max(255),
    password: passwordPolicySchema(),
    confirmPassword: z.string().min(8).max(72),

    companyName: z.string().trim().max(120).optional().or(z.literal("")),
    cnpj: z
      .string()
      .trim()
      .optional()
      .or(z.literal(""))
      .refine((v) => !v || cnpjRegex.test(v), "CNPJ inválido (use XX.XXX.XXX/0001-XX)"),
    phone: z
      .string()
      .trim()
      .optional()
      .or(z.literal(""))
      .refine((v) => !v || phoneRegex.test(v), "Telefone inválido (use (XX) XXXXX-XXXX)"),
    segment: z.string().optional().or(z.literal("")),
    acceptTerms: z.boolean().refine((v) => v === true, "Você precisa aceitar os termos"),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "As senhas não coincidem",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

export default function Cadastro() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = React.useState<1 | 2>(1);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [oauthLoading, setOauthLoading] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
      companyName: "",
      cnpj: "",
      phone: "",
      segment: "",
      acceptTerms: false,
    },
  });

  useEffect(() => {
    if (user) navigate("/dashboard/inicio", { replace: true });
  }, [user, navigate]);

  const onSubmit = async (values: FormValues) => {
    const redirectUrl = `${window.location.origin}/dashboard/inicio`;
    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          full_name: values.fullName,
          company_name: values.companyName || undefined,
          cnpj: values.cnpj || undefined,
          phone: values.phone || undefined,
          segment: values.segment || undefined,
        },
      },
    });

    if (error) {
      const isDuplicate = /already\sregistered|User\salready\sregistered|already\sexists/i.test(error.message);
      toast({
        title: "Não foi possível cadastrar",
        description: isDuplicate ? "Este email já está cadastrado." : error.message,
        variant: "destructive",
      });
      return;
    }

    // Se a confirmação de e-mail estiver desativada no Supabase, o usuário já estará logado.
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      toast({ title: "Conta criada!", description: "Bem-vindo(a)!" });
      navigate("/dashboard/inicio", { replace: true });
      return;
    }

    toast({
      title: "Cadastro iniciado",
      description: "Verifique seu email para confirmar a conta (se a confirmação estiver ativa).",
    });

    navigate("/login", { replace: true, state: { toast: { title: "Quase lá", description: "Confirme o email para entrar." } } });
  };

  const nextStep = async () => {
    const ok = await form.trigger(["fullName", "email", "password", "confirmPassword"]);
    if (!ok) return;
    setStep(2);
  };

  const onGoogle = async () => {
    setOauthLoading(true);
    const redirectTo = `${window.location.origin}/dashboard/inicio`;
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
    setOauthLoading(false);
    if (error) toast({ title: "Falha no Google", description: error.message, variant: "destructive" });
  };

  return (
    <AuthCardLayout title="Criar sua conta grátis" subtitle="Comece seu teste de 7 dias agora">
      <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
        {step === 1 ? (
          <div className="space-y-5">
            <div className="space-y-2">
              <Label>Nome Completo</Label>
              <Input placeholder="Seu nome" {...form.register("fullName")} />
              {form.formState.errors.fullName && (
                <p className="text-xs text-destructive">{form.formState.errors.fullName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input placeholder="seu@email.com" inputMode="email" autoComplete="email" {...form.register("email")} />
              {form.formState.errors.email && (
                <p className="text-xs text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Senha</Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
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
              <p className="text-xs text-muted-foreground">
                Use letras, números e caracteres especiais.
              </p>
              <PasswordStrength password={form.watch("password") ?? ""} />
              {form.formState.errors.password && (
                <p className="text-xs text-destructive">{form.formState.errors.password.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Confirmar Senha</Label>
              <div className="relative">
                <Input
                  type={showConfirm ? "text" : "password"}
                  autoComplete="new-password"
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
              type="button"
              className="w-full bg-brand-primary-light text-primary-foreground hover:bg-brand-primary-light/90"
              onClick={nextStep}
            >
              Continuar
            </Button>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Nome da Empresa</Label>
                <Input placeholder="(opcional)" {...form.register("companyName")} />
              </div>

              <div className="space-y-2">
                <Label>CNPJ</Label>
                <Input placeholder="XX.XXX.XXX/0001-XX" {...form.register("cnpj")} />
                {form.formState.errors.cnpj && (
                  <p className="text-xs text-destructive">{form.formState.errors.cnpj.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input placeholder="(11) 99999-9999" {...form.register("phone")} />
                {form.formState.errors.phone && (
                  <p className="text-xs text-destructive">{form.formState.errors.phone.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Segmento</Label>
                <Select value={form.watch("segment") || ""} onValueChange={(v) => form.setValue("segment", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      "Clínica/Consultório",
                      "Salão de Beleza",
                      "E-commerce",
                      "Imobiliária",
                      "Infoprodutos",
                      "Academia",
                      "Restaurante/Food",
                      "Serviços",
                      "Outro",
                    ].map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="flex items-start gap-2 text-sm text-muted-foreground">
                <Checkbox
                  checked={form.watch("acceptTerms")}
                  onCheckedChange={(v) => form.setValue("acceptTerms", !!v, { shouldValidate: true })}
                />
                <span>
                  Li e aceito os{" "}
                  <Dialog>
                    <DialogTrigger asChild>
                      <button type="button" className="text-brand-primary-light underline-offset-4 hover:underline">
                        Termos de Uso
                      </button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Termos de Uso</DialogTitle>
                      </DialogHeader>
                      <p className="text-sm text-muted-foreground">
                        Placeholder de Termos de Uso (substituir pelo texto oficial).
                      </p>
                    </DialogContent>
                  </Dialog>
                  {" "}e{" "}
                  <Dialog>
                    <DialogTrigger asChild>
                      <button type="button" className="text-brand-primary-light underline-offset-4 hover:underline">
                        Política de Privacidade
                      </button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Política de Privacidade</DialogTitle>
                      </DialogHeader>
                      <p className="text-sm text-muted-foreground">
                        Placeholder de Política de Privacidade (substituir pelo texto oficial).
                      </p>
                    </DialogContent>
                  </Dialog>
                </span>
              </label>
              {form.formState.errors.acceptTerms && (
                <p className="text-xs text-destructive">{form.formState.errors.acceptTerms.message}</p>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                Voltar
              </Button>
              <Button
                type="submit"
                className="bg-brand-primary-light text-primary-foreground hover:bg-brand-primary-light/90"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Criar Conta Grátis
              </Button>
            </div>
          </div>
        )}

        <div className="relative">
          <Separator />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
            ou
          </span>
        </div>

        <GoogleAuthButton onClick={onGoogle} loading={oauthLoading} label="Continuar com Google" />

        <p className="text-center text-sm text-muted-foreground">
          Já tem conta?{" "}
          <Link className="text-brand-primary-light underline-offset-4 hover:underline" to="/login">
            Faça login
          </Link>
        </p>
      </form>
    </AuthCardLayout>
  );
}
