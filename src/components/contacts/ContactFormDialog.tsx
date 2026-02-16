import * as React from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { format } from "date-fns";
import { CalendarIcon, Mail, Phone, Plus } from "lucide-react";

import type { ContactRow, ContactTag } from "@/pages/dashboard/contactsMock";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

import {
  BR_PHONE_REGEX,
  formatBrazilPhone,
  isDuplicatePhone,
  makeInitials,
  normalizePhoneDigits,
} from "@/components/contacts/contact-utils";

const TAGS_PRESET: ContactTag[] = ["VIP", "Lead Quente", "Cliente", "Inativo"];

const FormSchema = z.object({
  name: z.string().trim().min(3, "Informe um nome com no mínimo 3 caracteres"),
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
  tags: z.array(z.string()).default([]),

  cpfCnpj: z
    .string()
    .trim()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || /^[0-9./-]{11,18}$/.test(v), "CPF/CNPJ inválido"),
  birthDate: z.date().optional(),
  address: z.string().trim().optional().or(z.literal("")),
  notes: z.string().trim().optional().or(z.literal("")),
});

type FormValues = z.infer<typeof FormSchema>;

function normalizeCpfCnpj(value: string) {
  // MVP: apenas remove caracteres inválidos, mantendo . / -
  return value.replace(/[^0-9./-]/g, "");
}

export function ContactFormDialog({
  open,
  onOpenChange,
  mode,
  rows,
  initial,
  onSubmitContact,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "add" | "edit";
  rows: ContactRow[];
  initial?: ContactRow | null;
  onSubmitContact: (contact: ContactRow) => void;
}) {
  const [saving, setSaving] = React.useState(false);
  const [newTag, setNewTag] = React.useState("");
  const [extraOpen, setExtraOpen] = React.useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      tags: [],
      cpfCnpj: "",
      birthDate: undefined,
      address: "",
      notes: "",
    },
  });

  React.useEffect(() => {
    if (!open) return;
    const values: FormValues = {
      name: initial?.name ?? "",
      phone: initial?.phone ?? "",
      email: initial?.email ?? "",
      tags: (initial?.tags ?? []) as unknown as string[],
      cpfCnpj: initial?.cpfCnpj ?? "",
      birthDate: initial?.birthDate ? new Date(initial.birthDate) : undefined,
      address: initial?.address ?? "",
      notes: initial?.notes ?? "",
    };
    form.reset(values);
    setNewTag("");
    setExtraOpen(Boolean(initial?.cpfCnpj || initial?.birthDate || initial?.address || initial?.notes));
  }, [open, initial, form]);

  const title = mode === "add" ? "Adicionar Novo Contato" : "Editar Contato";
  const cta = mode === "add" ? "Salvar Contato" : "Salvar Alterações";

  const toggleTag = (tag: string) => {
    const current = new Set(form.getValues("tags"));
    if (current.has(tag)) current.delete(tag);
    else current.add(tag);
    form.setValue("tags", Array.from(current), { shouldDirty: true });
  };

  const addCustomTag = () => {
    const t = newTag.trim();
    if (!t) return;
    toggleTag(t);
    setNewTag("");
  };

  const submit = async (values: FormValues) => {
    const ignoreId = mode === "edit" ? initial?.id : undefined;
    if (isDuplicatePhone(rows, values.phone, ignoreId)) {
      toast({
        title: "Telefone duplicado",
        description: "Já existe um contato com este telefone.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      await new Promise((r) => window.setTimeout(r, 450));
      const now = new Date();
      const normalizedPhone = values.phone;
      const contact: ContactRow = {
        id: mode === "edit" && initial ? initial.id : `ct-${now.getTime()}`,
        name: values.name.trim(),
        initials: makeInitials(values.name),
        phone: normalizedPhone,
        email: (values.email ?? "").trim(),
        tags: (values.tags ?? []) as ContactTag[],
        favorite: mode === "edit" && initial ? initial.favorite : false,
        lastMessage: mode === "edit" && initial ? initial.lastMessage : "—",
        lastInteractionText: mode === "edit" && initial ? initial.lastInteractionText : "Agora",
        lastInteractionBucket: mode === "edit" && initial ? initial.lastInteractionBucket : "today",
        origin: mode === "edit" && initial ? initial.origin : "manual",
        company: mode === "edit" && initial ? initial.company : undefined,
        cpfCnpj: normalizeCpfCnpj(values.cpfCnpj ?? "") || undefined,
        birthDate: values.birthDate ? format(values.birthDate, "yyyy-MM-dd") : undefined,
        address: (values.address ?? "").trim() || undefined,
        notes: (values.notes ?? "").trim() || undefined,
      };

      // normalização: salvar também a forma só dígitos se quiser no futuro
      void normalizePhoneDigits(contact.phone);

      onSubmitContact(contact);
      onOpenChange(false);
      toast({
        title: mode === "add" ? "✅ Contato adicionado com sucesso!" : "✅ Contato atualizado!",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Preencha os dados do contato.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-6" onSubmit={form.handleSubmit(submit)}>
            <section className="space-y-4">
              <h3 className="text-sm font-semibold">Informações Básicas</h3>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Completo *</FormLabel>
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
                        <Input className="pl-9" placeholder="ex: email@dominio.com" {...field} />
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
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {TAGS_PRESET.map((t) => {
                            const active = field.value?.includes(t);
                            return (
                              <button
                                key={t}
                                type="button"
                                onClick={() => toggleTag(t)}
                                className={cn("rounded-full", active ? "" : "opacity-70")}
                              >
                                <Badge variant={active ? "default" : "outline"} className="rounded-full">
                                  {t}
                                </Badge>
                              </button>
                            );
                          })}
                          {(field.value ?? [])
                            .filter((t) => !TAGS_PRESET.includes(t as ContactTag))
                            .map((t) => (
                              <button
                                key={t}
                                type="button"
                                onClick={() => toggleTag(t)}
                                className="rounded-full"
                              >
                                <Badge variant="secondary" className="rounded-full">
                                  {t}
                                </Badge>
                              </button>
                            ))}
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                          <Input
                            value={newTag}
                            onChange={(e) => setNewTag(e.target.value)}
                            placeholder="+ Criar nova tag"
                          />
                          <Button type="button" variant="outline" onClick={addCustomTag} disabled={!newTag.trim()}>
                            <Plus className="h-4 w-4" />
                            Adicionar
                          </Button>
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </section>

            <Collapsible open={extraOpen} onOpenChange={setExtraOpen}>
              <CollapsibleTrigger asChild>
                <Button type="button" variant="outline" className="w-full justify-between">
                  Campos Adicionais
                  <span className="text-xs text-muted-foreground">{extraOpen ? "Ocultar" : "Mostrar"}</span>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4 space-y-4">
                <FormField
                  control={form.control}
                  name="cpfCnpj"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CPF/CNPJ</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="123.456.789-00"
                          onChange={(e) => field.onChange(normalizeCpfCnpj(e.target.value))}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="birthDate"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data de Nascimento</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              type="button"
                              variant="outline"
                              className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? format(field.value, "dd/MM/yyyy") : <span>Selecionar data</span>}
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Endereço</FormLabel>
                      <FormControl>
                        <Textarea {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Observações</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Anotações internas sobre este contato" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CollapsibleContent>
            </Collapsible>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Salvando..." : cta}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
