# Guia de Imports em Edge Functions

## Regra Única
**SEMPRE use o `supabase/import_map.json`** (via `deno.json`).

## Exemplos

### ✅ CORRETO
```typescript
import { createClient } from "supabase";
import { serve } from "std/http/server.ts";
```

### ❌ ERRADO
```typescript
import { createClient } from "npm:@supabase/supabase-js@2";
import { createClient } from "@supabase/supabase-js";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
```

## Troubleshooting

### Erro: "Module not found"
- Verificar `supabase/import_map.json`
- Rodar `deno cache --reload`

### Erro em deploy
- Verificar que o deploy está respeitando o `import_map`
- Testar localmente: `deno run --import-map=./supabase/import_map.json index.ts`
