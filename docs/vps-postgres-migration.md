# Migracao para VPS PostgreSQL (178.238.237.170)

Este projeto veio de um dump Supabase. Para rodar em PostgreSQL comum na sua VPS, use a sequencia abaixo.

## Arquivos usados

- `migration-pack-20260325-101013/db/00_vps_compat.sql`
- `migration-pack-20260325-101013/db/01_schema_nhost.sql`
- `migration-pack-20260325-101013/db/03_data_public_only.sql`

## Por que esta ordem

1. `00_vps_compat.sql` cria schemas/roles/funcoes minimas (`auth.uid()`, `auth.role()`) usadas por RLS e funcoes.
2. `01_schema_nhost.sql` cria o schema principal sem extensoes exclusivas do Supabase.
3. `03_data_public_only.sql` importa somente dados do schema `public` (sem `auth` e `storage`).

## Preparacao no servidor

No servidor (ou no seu PC com `psql`), defina variaveis:

```bash
export DB_HOST=178.238.237.170
export DB_PORT=5432
export DB_NAME=zapfllow
export DB_USER=zapfllow
```

Opcional: criar database vazio antes da carga.

```bash
createdb -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" "$DB_NAME"
```

## Execucao

```bash
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -v ON_ERROR_STOP=1 \
  -f migration-pack-20260325-101013/db/00_vps_compat.sql

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -v ON_ERROR_STOP=1 \
  -f migration-pack-20260325-101013/db/01_schema_nhost.sql

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -v ON_ERROR_STOP=1 \
  -f migration-pack-20260325-101013/db/03_data_public_only.sql
```

## Verificacao rapida

```sql
SELECT count(*) FROM public.profiles;
SELECT count(*) FROM public.contacts;
SELECT count(*) FROM public.webhooks;
```

## Observacoes importantes

- Nao execute `02_schema_auth_storage.sql` em PostgreSQL comum sem adaptar roles/admins do Supabase.
- Nao execute `03_data.sql` bruto se nao quiser migrar tabelas `auth.*` (inclui usuarios e sessoes).
- `vault.decrypted_secrets` foi criado como placeholder em `00_vps_compat.sql`. Se voce usar integracoes de segredo, precisa substituir por implementacao real de cofre.
