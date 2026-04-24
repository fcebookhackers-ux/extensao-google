param(
    [Parameter(Mandatory = $true)]
    [string]$InputFile,

    [Parameter(Mandatory = $true)]
    [string]$OutputFile
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

if (-not (Test-Path -LiteralPath $InputFile)) {
    throw "Input file not found: $InputFile"
}

$outDir = Split-Path -Parent $OutputFile
if ($outDir -and -not (Test-Path -LiteralPath $outDir)) {
    New-Item -ItemType Directory -Path $outDir -Force | Out-Null
}

if (Test-Path -LiteralPath $OutputFile) {
    Remove-Item -LiteralPath $OutputFile -Force
}

$skipCopy = $false

Get-Content -LiteralPath $InputFile | ForEach-Object {
    $line = $_

    if ($line -match '^COPY "auth"\.') {
        $skipCopy = $true
        return
    }

    if ($line -match '^COPY "storage"\.') {
        $skipCopy = $true
        return
    }

    if ($line -match '^COPY "public"\.') {
        $skipCopy = $false
        Add-Content -LiteralPath $OutputFile -Value $line
        return
    }

    if ($skipCopy) {
        if ($line -eq '\.') {
            $skipCopy = $false
        }
        return
    }

    Add-Content -LiteralPath $OutputFile -Value $line
}

Write-Host "Public-only dump generated: $OutputFile"
