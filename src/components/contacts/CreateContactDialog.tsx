import * as React from "react";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Mail, Phone } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { formatBrazilPhone, normalizePhoneDigits, BR_PHONE_REGEX } from "@/components/contacts/contact-utils";

const FormSchema = z.object({
  // Nome opcional: se vier vazio, salvamos um placeholder e deixamos o enrichment sugerir.
  name: z.string().trim().max(100, "Nome muito longo").optional().or(z.literal("")),
  phone: z
    .string()
    .trim()
    .regex(BR_PHONE_REGEX, "Telefone inválido. Use o formato (11) 98765-4321"),
  email: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || z.string().email().safeParse(v).success, "Email inválido"),
  tags: z.string().trim().optional().or(z.literal("")),
});

type FormValues = z.infer<typeof FormSchema>;

function toE164Brazil(phoneMasked: string) {
  const digits = normalizePhoneDigits(phoneMasked);
  // DDD (2) + número (8 ou 9)
  if (digits.length < 10 || digits.length > 11) return null;
  return `+55${digits}`;
}

function parseTags(value?: string) {
  const raw = (value ?? "")
    .split(/[,;\n]/)
    .map((t) => t.trim())
    .filter(Boolean);
  return Array.from(new Set(raw.map((t) => t.replace(/\s+/g, " "))));
}

export function CreateContactDialog({
  open,
  onOpenChange,
  onCreate,
  isCreating,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (payload: { name?: string; phone: string; email?: string | null; tags: string[] }) => void;
  isCreating?: boolean;
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      tags: "",
    },
  });

  React.useEffect(() => {
    if (!open) return;
    form.reset({ name: "", phone: "", email: "", tags: "" });
  }, [open, form]);

  const submit = (values: FormValues) => {
    const phone = toE164Brazil(values.phone);
    if (!phone) {
      form.setError("phone", { message: "Telefone inválido" });
      return;
    }

    const name = (values.name ?? "").trim();

    onCreate({
      name: name || undefined,
      phone,
      email: (values.email ?? "").trim() || null,
      tags: parseTags(values.tags),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo contato</DialogTitle>
          <DialogDescription>Adicione um contato manualmente.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-4" onSubmit={form.handleSubmit(submit)}>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: João da Silva" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Telefone *</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        {...field}
                        className="pl-9"
                        placeholder="(11) 98765-4321"
                        inputMode="tel"
                        onChange={(e) => field.onChange(formatBrazilPhone(e.target.value))}
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input className="pl-9" placeholder="email@dominio.com" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tags</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: VIP, Cliente" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={Boolean(isCreating)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={Boolean(isCreating)}>
                {isCreating ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
