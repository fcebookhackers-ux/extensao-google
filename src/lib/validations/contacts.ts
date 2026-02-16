import { z } from "zod";

// Schema para importação de contatos
export const contactImportSchema = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^\+?[1-9]\d{1,14}$/, "Número de telefone inválido (use formato internacional)"),
  name: z.string().trim().min(2, "Nome muito curto").max(100, "Nome muito longo"),
  email: z.string().trim().email("Email inválido").optional().or(z.literal("")),
  tags: z.array(z.string().trim().min(1, "Tag inválida")).max(20, "Máximo de 20 tags").optional(),
  customFields: z.record(z.string()).optional(),
});

export const contactBulkImportSchema = z.object({
  contacts: z.array(contactImportSchema).min(1, "Envie pelo menos 1 contato").max(10000, "Máximo de 10.000 contatos por importação"),
});

// Schema para criar contato individual
export const createContactSchema = contactImportSchema.extend({
  listId: z.string().uuid("ID de lista inválido").optional(),
});

// Type inference
export type ContactImport = z.infer<typeof contactImportSchema>;
export type ContactBulkImport = z.infer<typeof contactBulkImportSchema>;
