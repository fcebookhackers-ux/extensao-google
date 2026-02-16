# Integração WhatsApp - Guia de Uso

Este guia descreve o fluxo de conexão do WhatsApp via Evolution API e como usar a área de conversas no dashboard.

## Conexão inicial

1. Acesse **Dashboard → WhatsApp**
2. Clique em **Conectar WhatsApp**
3. Aguarde o QR Code aparecer
4. Escaneie o QR Code com seu celular (WhatsApp)
5. Aguarde a confirmação: o status deve mudar para **connected**

## Conversas e envio de mensagens

1. Acesse **Dashboard → Conversas** (rota: `/dashboard/conversas`)
2. Selecione um contato na lista
3. Digite sua mensagem
4. Clique em **Enviar**

## O que acontece por trás

- A função `evolution-create-instance` cria a instância na Evolution API e registra em `whatsapp_instances`.
- A função `evolution-webhook` recebe eventos e persiste mensagens/conversas no banco.
- A função `evolution-send-message` envia mensagens de saída via Evolution API.
- A função `evolution-disconnect-instance` desconecta/remove a instância na Evolution API e remove do banco.

## Troubleshooting

### QR Code não aparece

- Verifique as secrets no Supabase (**Project Settings → Edge Functions → Secrets**):
  - `EVOLUTION_API_URL`
  - `EVOLUTION_API_KEY`
  - `SERVICE_ROLE_KEY`
- Verifique logs da função `evolution-create-instance`.
- Confirme que a Evolution API está acessível a partir do runtime do Supabase.

### Mensagens não aparecem

- Confirme que o webhook foi configurado para a instância.
- Verifique logs da função `evolution-webhook`.
- Confira se a tabela `whatsapp_messages` está recebendo inserts/updates.

### Não consegue enviar mensagens

- Confirme que a instância está com status **connected** em `whatsapp_instances`.
- Verifique logs da função `evolution-send-message`.
- Confirme que o número de destino está no formato correto.
