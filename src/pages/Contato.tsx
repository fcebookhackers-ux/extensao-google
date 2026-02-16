import { LandingFooter } from "@/components/landing/LandingFooter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Mail, MessageSquare, Send, Phone, MapPin } from "lucide-react";
import * as React from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Separator } from "@/components/ui/separator";

const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, { message: "Nome deve ter pelo menos 2 caracteres" })
    .max(100, { message: "Nome deve ter no máximo 100 caracteres" }),
  email: z
    .string()
    .trim()
    .email({ message: "Email inválido" })
    .max(255, { message: "Email deve ter no máximo 255 caracteres" }),
  phone: z
    .string()
    .trim()
    .optional()
    .refine(
      (val) => !val || val.length <= 20,
      { message: "Telefone deve ter no máximo 20 caracteres" }
    ),
  subject: z
    .string()
    .trim()
    .min(3, { message: "Assunto deve ter pelo menos 3 caracteres" })
    .max(150, { message: "Assunto deve ter no máximo 150 caracteres" }),
  message: z
    .string()
    .trim()
    .min(10, { message: "Mensagem deve ter pelo menos 10 caracteres" })
    .max(2000, { message: "Mensagem deve ter no máximo 2000 caracteres" }),
});

type ContactFormData = z.infer<typeof contactSchema>;

export default function Contato() {
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);

    try {
      // TODO: Implementar envio real (Supabase Edge Function ou Email Service)
      // Por enquanto, simulamos um envio bem-sucedido
      await new Promise((resolve) => setTimeout(resolve, 1500));

      toast.success("Mensagem enviada!", {
        description: "Responderemos em breve no email informado.",
      });

      reset();
    } catch (error) {
      toast.error("Erro ao enviar", {
        description: "Tente novamente ou entre em contato por email.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-6">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-md bg-muted">
              <MessageSquare className="h-5 w-5 text-foreground" />
            </span>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">Contato</h1>
                <Badge variant="outline">ZapFllow</Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Entre em contato conosco. Estamos aqui para ajudar!
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
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Contact Info */}
          <div className="space-y-4 lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Informações de Contato</CardTitle>
                <CardDescription>Outras formas de nos encontrar</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-5 w-5 text-brand-primary-light" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Email</p>
                    <a
                      href="mailto:contato@zapfllow.com.br"
                      className="text-sm text-muted-foreground hover:text-brand-primary-light"
                    >
                      contato@zapfllow.com.br
                    </a>
                  </div>
                </div>

                <Separator />

                <div className="flex items-start gap-3">
                  <Phone className="mt-0.5 h-5 w-5 text-brand-primary-light" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Telefone</p>
                    <a
                      href="tel:+5516997214938"
                      className="text-sm text-muted-foreground hover:text-brand-primary-light"
                    >
                      +55 16 997214938
                    </a>
                  </div>
                </div>

                <Separator />

                <div className="flex items-start gap-3">
                  <MapPin className="mt-0.5 h-5 w-5 text-brand-primary-light" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Endereço</p>
                    <p className="text-sm text-muted-foreground">
                      São Paulo, SP
                      <br />
                      Brasil
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Horário de Atendimento</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Seg - Sex</span>
                  <span className="font-medium">9h - 18h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Sábado</span>
                  <span className="font-medium">9h - 13h</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Domingo</span>
                  <span className="font-medium">Fechado</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contact Form */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Envie uma Mensagem</CardTitle>
              <CardDescription>
                Preencha o formulário abaixo e entraremos em contato em breve.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">
                      Nome <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="name"
                      placeholder="Seu nome completo"
                      {...register("name")}
                      aria-invalid={errors.name ? "true" : "false"}
                    />
                    {errors.name && (
                      <p className="text-sm text-destructive">{errors.name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">
                      Email <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="seu@email.com"
                      {...register("email")}
                      aria-invalid={errors.email ? "true" : "false"}
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive">{errors.email.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone (opcional)</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="(11) 99999-9999"
                      {...register("phone")}
                      aria-invalid={errors.phone ? "true" : "false"}
                    />
                    {errors.phone && (
                      <p className="text-sm text-destructive">{errors.phone.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject">
                      Assunto <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="subject"
                      placeholder="Como podemos ajudar?"
                      {...register("subject")}
                      aria-invalid={errors.subject ? "true" : "false"}
                    />
                    {errors.subject && (
                      <p className="text-sm text-destructive">{errors.subject.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">
                    Mensagem <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="message"
                    placeholder="Descreva sua dúvida ou solicitação..."
                    className="min-h-[150px]"
                    {...register("message")}
                    aria-invalid={errors.message ? "true" : "false"}
                  />
                  {errors.message && (
                    <p className="text-sm text-destructive">{errors.message.message}</p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full bg-brand-primary-light text-primary-foreground hover:bg-brand-primary-mid"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <>Enviando...</>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Enviar Mensagem
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
