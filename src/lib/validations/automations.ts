import { z } from "zod";

// Validação de posição de blocos
const positionSchema = z.object({
  x: z.number().min(-10000, "Posição X inválida").max(10000, "Posição X inválida"),
  y: z.number().min(-10000, "Posição Y inválida").max(10000, "Posição Y inválida"),
});

// Schema base para todos os blocos
const blockBaseSchema = z.object({
  id: z.string().uuid("ID do bloco inválido"),
  type: z.enum(["message", "question", "condition", "action", "delay", "webhook"], {
    message: "Tipo de bloco inválido",
  }),
  position: positionSchema,
});

// Schema para bloco de mensagem
const messageBlockSchema = blockBaseSchema.extend({
  type: z.literal("message"),
  data: z.object({
    text: z
      .string()
      .trim()
      .min(1, "Mensagem não pode estar vazia")
      .max(4096, "Mensagem muito longa (máx 4096 caracteres)"),
    mediaUrl: z
      .string()
      .trim()
      .optional()
      .or(z.literal(""))
      .refine((v) => !v || /^https?:\/\//i.test(v), { message: "URL inválida" }),
    buttons: z
      .array(
        z.object({
          id: z.string().min(1, "ID do botão é obrigatório"),
          text: z
            .string()
            .trim()
            .min(1, "Texto do botão é obrigatório")
            .max(20, "Texto do botão muito longo (máx 20 caracteres)"),
          action: z.enum(["next", "jump", "url"], { message: "Ação do botão inválida" }),
          target: z.string().trim().optional(),
        })
      )
      .max(10, "Máximo de 10 botões permitidos")
      .optional(),
  }),
});

// Schema para bloco de pergunta
const questionBlockSchema = blockBaseSchema.extend({
  type: z.literal("question"),
  data: z.object({
    question: z
      .string()
      .trim()
      .min(1, "Pergunta é obrigatória")
      .max(500, "Pergunta muito longa"),
    variableName: z
      .string()
      .trim()
      .min(1, "Nome da variável é obrigatório")
      .max(50, "Nome da variável muito longo")
      .regex(/^[a-zA-Z_][a-zA-Z0-9_]*$/, "Nome de variável inválido (use apenas letras, números e _ )"),
    validationType: z.enum(["text", "number", "email", "phone", "date"], {
      message: "Tipo de validação inválido",
    }).optional(),
  }),
});

// Schema para bloco de webhook
const webhookBlockSchema = blockBaseSchema.extend({
  type: z.literal("webhook"),
  data: z.object({
    url: z
      .string()
      .trim()
      .url("URL inválida")
      .refine((url) => url.startsWith("https://"), {
        message: "Webhook deve usar HTTPS",
      })
      .refine(
        (url) => {
          try {
            const hostname = new URL(url).hostname;
            // Bloqueia IPs locais e privados
            return !/(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(hostname);
          } catch {
            return false;
          }
        },
        { message: "URLs locais não são permitidas" }
      ),
    method: z.enum(["GET", "POST", "PUT"], { message: "Método inválido" }),
    headers: z.record(z.string()).optional(),
    timeout: z.number().min(1000, "Timeout mínimo é 1000ms").max(30000, "Timeout máximo é 30000ms").optional(),
  }),
});

// Schema para bloco de delay
const delayBlockSchema = blockBaseSchema.extend({
  type: z.literal("delay"),
  data: z.object({
    duration: z
      .number()
      .min(1, "Delay mínimo é 1 segundo")
      .max(86400, "Delay máximo é 24 horas (86400 segundos)"),
    unit: z.enum(["seconds", "minutes", "hours"], { message: "Unidade de delay inválida" }),
  }),
});

// Union de todos os tipos de blocos
const blockSchema = z.discriminatedUnion("type", [messageBlockSchema, questionBlockSchema, webhookBlockSchema, delayBlockSchema]);

// Schema de conexões entre blocos
const connectionSchema = z.object({
  id: z.string().uuid("ID da conexão inválido"),
  from: z.string().uuid("Origem inválida"),
  to: z.string().uuid("Destino inválido"),
  condition: z.string().trim().optional(),
});

// Schema completo do fluxo de automação
export const automationFlowSchema = z.object({
  blocks: z
    .array(blockSchema)
    .min(1, "O fluxo precisa ter pelo menos 1 bloco")
    .max(100, "Máximo de 100 blocos permitidos"),
  connections: z.array(connectionSchema),
});

// Schema para criar/editar automação
export const automationSchema = z.object({
  name: z.string().trim().min(3, "Nome deve ter pelo menos 3 caracteres").max(100, "Nome muito longo (máx 100 caracteres)"),
  description: z.string().trim().max(500, "Descrição muito longa (máx 500 caracteres)").optional().or(z.literal("")),
  flow: automationFlowSchema,
  status: z.enum(["draft", "active", "paused"], { message: "Status inválido" }).optional(),
  tags: z.array(z.string().trim().min(1, "Tag inválida")).max(10, "Máximo de 10 tags").optional(),
});

// Type inference
export type AutomationFlow = z.infer<typeof automationFlowSchema>;
export type Automation = z.infer<typeof automationSchema>;
export type Block = z.infer<typeof blockSchema>;
