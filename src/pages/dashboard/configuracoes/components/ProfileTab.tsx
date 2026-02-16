import * as React from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { Camera, Calendar as CalendarIcon, Lock } from "lucide-react";

import { toast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { PasswordStrength } from "@/components/auth/PasswordStrength";

import { PasswordField } from "@/pages/dashboard/configuracoes/components/PasswordField";
import { TimezoneCombobox } from "@/pages/dashboard/configuracoes/components/TimezoneCombobox";

const profileSchema = z.object({
  fullName: z.string().trim().min(3, "Informe seu nome completo"),
  phone: z.string().trim().optional(),
  birthDate: z.date().optional(),
  role: z.string().trim().optional(),
  language: z.enum(["pt-BR", "es", "en"]),
  timezone: z.string().min(1, "Selecione um fuso horário"),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Informe sua senha atual"),
    newPassword: z.string().min(8, "A nova senha deve ter pelo menos 8 caracteres"),
    confirmPassword: z.string().min(1, "Confirme a nova senha"),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "As senhas não conferem",
    path: ["confirmPassword"],
  });

type PasswordFormValues = z.infer<typeof passwordSchema>;

function formatPhoneBR(raw: string) {
  const digits = raw.replace(/\D/g, "").slice(0, 11);
  const ddd = digits.slice(0, 2);
  const p1 = digits.slice(2, 7);
  const p2 = digits.slice(7, 11);
  if (!digits) return "";
  if (digits.length < 3) return `(${digits}`;
  if (digits.length < 8) return `(${ddd}) ${digits.slice(2)}`;
  return `(${ddd}) ${p1}-${p2}`.trim();
}

const TIMEZONES = [
  { value: "America/Sao_Paulo", label: "América/São Paulo (BRT, UTC-3)" },
  { value: "America/Manaus", label: "América/Manaus (AMT, UTC-4)" },
  { value: "America/Fortaleza", label: "América/Fortaleza (BRT, UTC-3)" },
  { value: "Europe/Lisbon", label: "Europa/Lisboa (WET, UTC+0)" },
  { value: "America/New_York", label: "América/Nova York (ET)" },
  { value: "Europe/Madrid", label: "Europa/Madrid (CET)" },
];

export function ProfileTab() {
  // Mock
  const email = "joao.silva@gmail.com";

  const [avatarUrl, setAvatarUrl] = React.useState<string | null>(null);
  const [pendingAvatar, setPendingAvatar] = React.useState<{ file: File; previewUrl: string } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: "João da Silva",
      phone: "(11) 98765-4321",
      birthDate: new Date("1990-03-15"),
      role: "Gerente de Vendas",
      language: "pt-BR",
      timezone: "America/Sao_Paulo",
    },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  const newPassword = passwordForm.watch("newPassword");

  const onPickAvatar = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "O tamanho máximo é 5MB.", variant: "destructive" });
      return;
    }
    if (!/(image\/jpeg|image\/png|image\/webp)/.test(file.type)) {
      toast({ title: "Formato inválido", description: "Use JPG, PNG ou WEBP.", variant: "destructive" });
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setPendingAvatar({ file, previewUrl });
  };

  React.useEffect(() => {
    return () => {
      if (pendingAvatar?.previewUrl) URL.revokeObjectURL(pendingAvatar.previewUrl);
    };
  }, [pendingAvatar]);

  return (
    <div className="space-y-4">
      {/* Foto */}
      <Card>
        <CardHeader>
          <CardTitle>Foto de Perfil</CardTitle>
          <CardDescription>Recomendado: 400x400px. Máximo: 5MB (JPG/PNG/WEBP).</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
          <div className="relative">
            <Avatar className="h-[120px] w-[120px]">
              <AvatarImage src={pendingAvatar?.previewUrl ?? avatarUrl ?? undefined} />
              <AvatarFallback className="text-2xl">JS</AvatarFallback>
            </Avatar>
            <button
              type="button"
              className="absolute inset-0 rounded-full bg-foreground/0 transition-colors hover:bg-foreground/25"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Alterar foto"
            >
              <span className="sr-only">Alterar foto</span>
              <Camera className="absolute left-1/2 top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 text-background opacity-0 transition-opacity hover:opacity-100" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onPickAvatar(f);
                e.currentTarget.value = "";
              }}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
              Alterar Foto
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!avatarUrl && !pendingAvatar}
              onClick={() => {
                setAvatarUrl(null);
                setPendingAvatar(null);
                toast({ title: "Foto removida" });
              }}
            >
              Remover Foto
            </Button>
          </div>
        </CardContent>
        {pendingAvatar ? (
          <CardFooter className="justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setPendingAvatar(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={() => {
                setAvatarUrl(pendingAvatar.previewUrl);
                setPendingAvatar(null);
                toast({ title: "✅ Foto atualizada" });
              }}
            >
              Salvar Foto
            </Button>
          </CardFooter>
        ) : null}
      </Card>

      {/* Informações pessoais */}
      <Card>
        <CardHeader>
          <CardTitle>Informações Pessoais</CardTitle>
          <CardDescription>Atualize seus dados de perfil.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...profileForm}>
            <form
              className="grid grid-cols-1 gap-4 md:grid-cols-2"
              onSubmit={profileForm.handleSubmit(() => {
                toast({ title: "✅ Perfil atualizado com sucesso!" });
              })}
            >
              <FormField
                control={profileForm.control}
                name="fullName"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Nome Completo *</FormLabel>
                    <FormControl>
                      <Input placeholder="Seu nome" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2 md:col-span-2">
                <Label>Email *</Label>
                <div className="relative">
                  <Input value={email} disabled className="pr-10" />
                  <Lock className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                </div>
                <p className="text-xs text-muted-foreground">Para alterar o email, contate o suporte.</p>
              </div>

              <FormField
                control={profileForm.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="(XX) XXXXX-XXXX"
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(formatPhoneBR(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={profileForm.control}
                name="birthDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Nascimento</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button variant="outline" className="w-full justify-between font-normal">
                            <span className={field.value ? "" : "text-muted-foreground"}>
                              {field.value ? format(field.value, "dd/MM/yyyy") : "Selecionar"}
                            </span>
                            <CalendarIcon className="h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={profileForm.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cargo</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: CEO, Gerente, Atendente" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={profileForm.control}
                name="language"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Idioma</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pt-BR">Português (BR)</SelectItem>
                        <SelectItem value="es">Espanhol</SelectItem>
                        <SelectItem value="en">Inglês</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={profileForm.control}
                name="timezone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fuso Horário</FormLabel>
                    <FormControl>
                      <TimezoneCombobox
                        value={field.value}
                        onChange={field.onChange}
                        options={TIMEZONES}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-wrap gap-2 md:col-span-2 md:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => profileForm.reset()}
                >
                  Cancelar
                </Button>
                <Button type="submit">Salvar Alterações</Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Senha */}
      <Card>
        <CardHeader>
          <CardTitle>Segurança da Conta</CardTitle>
          <CardDescription>Altere sua senha de acesso.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...passwordForm}>
            <form
              className="space-y-4"
              onSubmit={passwordForm.handleSubmit(() => {
                toast({ title: "✅ Senha alterada com sucesso!" });
                passwordForm.reset();
              })}
            >
              <FormField
                control={passwordForm.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha Atual *</FormLabel>
                    <FormControl>
                      <PasswordField value={field.value} onChange={field.onChange} placeholder="Digite sua senha atual" autoComplete="current-password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={passwordForm.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nova Senha *</FormLabel>
                    <FormControl>
                      <PasswordField value={field.value} onChange={field.onChange} placeholder="Crie uma nova senha" autoComplete="new-password" />
                    </FormControl>
                    <PasswordStrength password={newPassword} />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={passwordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar Nova Senha *</FormLabel>
                    <FormControl>
                      <PasswordField value={field.value} onChange={field.onChange} placeholder="Repita a nova senha" autoComplete="new-password" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="rounded-md border bg-muted/50 p-3 text-sm">
                <p className="font-medium">Requisitos</p>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
                  <li>Mínimo 8 caracteres</li>
                  <li>Pelo menos 1 letra maiúscula</li>
                  <li>Pelo menos 1 número</li>
                  <li>Caractere especial (recomendado)</li>
                </ul>
              </div>

              <div className="flex justify-end">
                <Button type="submit">Alterar Senha</Button>
              </div>
            </form>
          </Form>
        </CardContent>
        <CardFooter className="justify-between">
          <Badge variant="outline">Dica: use um gerenciador de senhas</Badge>
        </CardFooter>
      </Card>
    </div>
  );
}
