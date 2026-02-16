import * as React from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Building2, Camera } from "lucide-react";

import { toast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const companySchema = z.object({
  companyName: z.string().trim().min(2, "Informe o nome da empresa"),
  cnpj: z.string().trim().optional(),
  corporateName: z.string().trim().optional(),
  stateRegistration: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  email: z.string().trim().email("Email inválido"),
  website: z.string().trim().url("URL inválida").optional().or(z.literal("")),
  segment: z.string().min(1, "Selecione um segmento"),
  notes: z.string().trim().optional(),
  address: z.object({
    cep: z.string().trim().optional(),
    street: z.string().trim().optional(),
    number: z.string().trim().optional(),
    complement: z.string().trim().optional(),
    district: z.string().trim().optional(),
    city: z.string().trim().optional(),
    state: z.string().trim().optional(),
    country: z.string().trim().default("Brasil"),
  }),
});

type CompanyFormValues = z.infer<typeof companySchema>;

export function CompanyTab() {
  // Mock plano
  const isStarter = false;

  const [logoUrl, setLogoUrl] = React.useState<string | null>(null);
  const logoInputRef = React.useRef<HTMLInputElement | null>(null);

  const form = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      companyName: "Clínica Saúde+",
      cnpj: "12.345.678/0001-90",
      corporateName: "Clínica Saúde Mais LTDA",
      phone: "(11) 3456-7890",
      email: "contato@clinicasaudemais.com.br",
      website: "https://clinicasaudemais.com.br",
      segment: "Clínica",
      notes: "",
      address: { country: "Brasil" },
    },
  });

  const onPickLogo = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "O tamanho máximo é 5MB.", variant: "destructive" });
      return;
    }
    const url = URL.createObjectURL(file);
    setLogoUrl(url);
    toast({ title: "✅ Logo atualizada" });
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Logo da Empresa</CardTitle>
          <CardDescription>
            Logo aparecerá em relatórios e emails enviados (apenas Plano Pro+).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-20 w-52 items-center justify-center rounded-md border bg-muted/30">
              {logoUrl ? (
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                <img src={logoUrl} alt="Logo da empresa" className="max-h-[64px] max-w-[180px] object-contain" />
              ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Building2 className="h-4 w-4" />
                  <span>Sem logo</span>
                </div>
              )}
            </div>
            {isStarter ? <Badge variant="secondary">Disponível no Plano Pro</Badge> : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              disabled={isStarter}
              onClick={() => logoInputRef.current?.click()}
            >
              <Camera className="h-4 w-4" />
              Alterar Logo
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!logoUrl}
              onClick={() => {
                setLogoUrl(null);
                toast({ title: "Logo removida" });
              }}
            >
              Remover
            </Button>
            {isStarter ? <Button type="button">Fazer Upgrade</Button> : null}
          </div>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onPickLogo(f);
              e.currentTarget.value = "";
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dados da Empresa</CardTitle>
          <CardDescription>Informações usadas em relatórios e faturamento.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form
              className="grid grid-cols-1 gap-4 md:grid-cols-2"
              onSubmit={form.handleSubmit(() => toast({ title: "✅ Empresa atualizada" }))}
            >
              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome da Empresa *</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="cnpj"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CNPJ</FormLabel>
                    <FormControl>
                      <Input placeholder="12.345.678/0001-90" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="corporateName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Razão Social</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="stateRegistration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Inscrição Estadual</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                    <FormLabel>Telefone Comercial</FormLabel>
                    <FormControl>
                      <Input {...field} />
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
                    <FormLabel>Email Comercial</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input placeholder="https://..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="segment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Segmento de Atuação *</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {[
                          "Clínica",
                          "Salão",
                          "E-commerce",
                          "Imobiliária",
                          "Infoprodutos",
                          "Academia",
                          "Restaurante",
                          "Serviços",
                          "Outro",
                        ].map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Observações</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Opcional" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex flex-wrap gap-2 md:col-span-2 md:justify-end">
                <Button type="button" variant="outline" onClick={() => form.reset()}>
                  Cancelar
                </Button>
                <Button type="submit">Salvar Informações</Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Endereço</CardTitle>
          <CardDescription>Preencha o endereço comercial.</CardDescription>
        </CardHeader>
        <CardContent>
          <Collapsible defaultOpen={false}>
            <CollapsibleTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                Mostrar / ocultar
                <span className="text-xs text-muted-foreground">(ViaCEP em breve)</span>
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input placeholder="CEP" {...form.register("address.cep")} />
                <Input placeholder="Logradouro" {...form.register("address.street")} />
                <Input placeholder="Número" {...form.register("address.number")} />
                <Input placeholder="Complemento" {...form.register("address.complement")} />
                <Input placeholder="Bairro" {...form.register("address.district")} />
                <Input placeholder="Cidade" {...form.register("address.city")} />
                <Input placeholder="Estado" {...form.register("address.state")} />
                <Input placeholder="País" defaultValue="Brasil" {...form.register("address.country")} />
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => form.reset(form.getValues())}>
                  Cancelar
                </Button>
                <Button type="button" onClick={() => toast({ title: "✅ Endereço salvo" })}>
                  Salvar Endereço
                </Button>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground">
          Dica: ao inserir o CEP, faremos a busca automática (ViaCEP) na próxima etapa.
        </CardFooter>
      </Card>
    </div>
  );
}
