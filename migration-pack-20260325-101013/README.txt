# Migration Pack

Gerado em: 2026-03-25 10:16:19 -03:00
Project ref: qvcanphpifzocejtqdip

## Conteudo

- db/01_schema.sql
- db/02_schema_auth_storage.sql
- db/03_data.sql
- db/04_roles.sql
- meta/05_rls_policies.csv (somente se DbUrl foi informado)
- supabase_snapshot/functions
- supabase_snapshot/migrations
- storage/* (somente se StorageEndpoint e Buckets foram informados)

## Observacoes

- O arquivo de dados (03_data.sql) costuma ser grande.
- Auth (usuarios/sessoes) e Storage metadata ficam no schema uth e storage.
- Storage binario (arquivos) so e exportado quando a secao S3 e configurada.
  Storage exportado: False
