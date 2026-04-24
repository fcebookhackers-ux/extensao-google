param(
    [Parameter(Mandatory = $true)]
    [string]$ProjectRef,

    [string]$OutputRoot = ".",
    [string]$DbUrl,
    [string]$StorageEndpoint,
    [string]$StorageRegion = "us-east-1",
    [string]$StorageAccessKey,
    [string]$StorageSecretKey,
    [string[]]$Buckets = @()
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "==> $Message" -ForegroundColor Cyan
}

function Ensure-Command {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $false)][string]$InstallHint = ""
    )
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        $hint = if ($InstallHint) { " $InstallHint" } else { "" }
        throw "Comando '$Name' nao encontrado.$hint"
    }
}

function Run-Checked {
    param(
        [Parameter(Mandatory = $true)][string]$Command,
        [Parameter(Mandatory = $true)][string[]]$Arguments
    )
    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "Falha ao executar: $Command $($Arguments -join ' ')"
    }
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$packDir = Join-Path $OutputRoot "migration-pack-$timestamp"
$dbDir = Join-Path $packDir "db"
$metaDir = Join-Path $packDir "meta"
$storageDir = Join-Path $packDir "storage"
$supabaseSnapshotDir = Join-Path $packDir "supabase_snapshot"

Write-Step "Validando pre-requisitos"
Ensure-Command -Name "supabase" -InstallHint "Instale a Supabase CLI: https://supabase.com/docs/guides/cli"
if ($DbUrl) {
    Ensure-Command -Name "psql" -InstallHint "Instale PostgreSQL client tools (psql)"
}
if ($StorageEndpoint -or $Buckets.Count -gt 0) {
    Ensure-Command -Name "aws" -InstallHint "Instale AWS CLI v2"
}

Write-Step "Criando estrutura de backup"
New-Item -ItemType Directory -Path $packDir, $dbDir, $metaDir, $storageDir, $supabaseSnapshotDir -Force | Out-Null

Write-Step "Vinculando projeto Supabase"
Run-Checked -Command "supabase" -Arguments @("link", "--project-ref", $ProjectRef)

Write-Step "Exportando schema principal"
Run-Checked -Command "supabase" -Arguments @("db", "dump", "--linked", "--file", (Join-Path $dbDir "01_schema.sql"))

Write-Step "Exportando schema auth/storage"
Run-Checked -Command "supabase" -Arguments @("db", "dump", "--linked", "--schema", "auth,storage", "--file", (Join-Path $dbDir "02_schema_auth_storage.sql"))

Write-Step "Exportando dados"
Run-Checked -Command "supabase" -Arguments @("db", "dump", "--linked", "--data-only", "--use-copy", "--file", (Join-Path $dbDir "03_data.sql"))

Write-Step "Exportando roles/permissoes"
Run-Checked -Command "supabase" -Arguments @("db", "dump", "--linked", "--role-only", "--file", (Join-Path $dbDir "04_roles.sql"))

if ($DbUrl) {
    Write-Step "Exportando politicas RLS (CSV)"
    $rlsCsv = (Join-Path $metaDir "05_rls_policies.csv")
    $rlsQuery = "COPY (SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check FROM pg_policies ORDER BY 1,2,3) TO STDOUT WITH CSV HEADER"
    & psql $DbUrl -c $rlsQuery -o $rlsCsv
    if ($LASTEXITCODE -ne 0) {
        throw "Falha ao exportar RLS via psql."
    }
} else {
    Write-Step "Pulando export de RLS (DbUrl nao informado)"
}

if ((Test-Path ".\supabase\functions")) {
    Write-Step "Copiando supabase/functions"
    Copy-Item -Path ".\supabase\functions" -Destination $supabaseSnapshotDir -Recurse -Force
}
if ((Test-Path ".\supabase\migrations")) {
    Write-Step "Copiando supabase/migrations"
    Copy-Item -Path ".\supabase\migrations" -Destination $supabaseSnapshotDir -Recurse -Force
}
if ((Test-Path ".\supabase\config.toml")) {
    Copy-Item -Path ".\supabase\config.toml" -Destination $supabaseSnapshotDir -Force
}

$didStorageExport = $false
if ($StorageEndpoint -and $Buckets.Count -gt 0) {
    if (-not $StorageAccessKey -or -not $StorageSecretKey) {
        throw "Para exportar Storage, informe StorageAccessKey e StorageSecretKey."
    }

    Write-Step "Exportando buckets via S3 API"
    $oldKey = $env:AWS_ACCESS_KEY_ID
    $oldSecret = $env:AWS_SECRET_ACCESS_KEY
    $oldRegion = $env:AWS_DEFAULT_REGION

    try {
        $env:AWS_ACCESS_KEY_ID = $StorageAccessKey
        $env:AWS_SECRET_ACCESS_KEY = $StorageSecretKey
        $env:AWS_DEFAULT_REGION = $StorageRegion

        foreach ($bucket in $Buckets) {
            $bucketTarget = Join-Path $storageDir $bucket
            New-Item -ItemType Directory -Path $bucketTarget -Force | Out-Null
            Run-Checked -Command "aws" -Arguments @("s3", "sync", "s3://$bucket", $bucketTarget, "--endpoint-url", $StorageEndpoint)
        }
        $didStorageExport = $true
    }
    finally {
        $env:AWS_ACCESS_KEY_ID = $oldKey
        $env:AWS_SECRET_ACCESS_KEY = $oldSecret
        $env:AWS_DEFAULT_REGION = $oldRegion
    }
} else {
    Write-Step "Pulando export de Storage (StorageEndpoint/Buckets nao informados)"
}

$readme = @"
# Migration Pack

Gerado em: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss K")
Project ref: $ProjectRef

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
- Auth (usuarios/sessoes) e Storage metadata ficam no schema `auth` e `storage`.
- Storage binario (arquivos) so e exportado quando a secao S3 e configurada.
  Storage exportado: $didStorageExport
"@

Set-Content -Path (Join-Path $packDir "README.txt") -Value $readme -Encoding UTF8

Write-Host ""
Write-Host "Backup concluido com sucesso." -ForegroundColor Green
Write-Host "Pacote criado em: $packDir"
