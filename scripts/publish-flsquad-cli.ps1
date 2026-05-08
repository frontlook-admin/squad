param(
  [switch]$SkipLint,
  [switch]$SkipTests,
  [switch]$SkipSdkCheck,
  [string]$CacheDir = "C:\tmp\npm-cache-flsquad-cli"
)

$ErrorActionPreference = "Stop"

function Invoke-Step([string]$Message, [scriptblock]$Action) {
  Write-Host ""
  Write-Host "==> $Message" -ForegroundColor Cyan
  & $Action
}

function Assert-LastExitCode([string]$Message) {
  if ($LASTEXITCODE -ne 0) {
    throw $Message
  }
}

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$env:NPM_CONFIG_CACHE = $CacheDir
$env:NPM_CONFIG_USERCONFIG = Join-Path $env:USERPROFILE ".npmrc"

$cliPkgPath = Join-Path $repoRoot "packages/squad-cli/package.json"
$cliPkg = Get-Content $cliPkgPath -Raw | ConvertFrom-Json
$sdkVersion = [string]$cliPkg.dependencies."@bradygaster/squad-sdk"

if ($cliPkg.name -ne "flsquad-cli") {
  throw "CLI package name is '$($cliPkg.name)'. Expected 'flsquad-cli'."
}

Invoke-Step "Checking npm auth" {
  npm whoami --registry https://registry.npmjs.org/
  Assert-LastExitCode "npm auth check failed. Run 'npm login' for registry.npmjs.org."
}

if (-not $SkipSdkCheck) {
  Invoke-Step "Checking npmjs visibility for @bradygaster/squad-sdk@$sdkVersion" {
    npm view "@bradygaster/squad-sdk@$sdkVersion" version --registry https://registry.npmjs.org/
    Assert-LastExitCode "SDK version $sdkVersion is not available on npmjs. Publish the SDK there first or rerun with -SkipSdkCheck if you knowingly use a different registry."
  }
}

if (-not $SkipLint) {
  Invoke-Step "Running lint" {
    npm run lint
    Assert-LastExitCode "Lint failed."
  }
}

if (-not $SkipTests) {
  Invoke-Step "Running focused CLI tests" {
    npx vitest run test/cli/upgrade.test.ts test/cli.test.ts
    Assert-LastExitCode "Focused CLI tests failed."
  }
}

Invoke-Step "Building CLI package" {
  npm run build -w packages/squad-cli
  Assert-LastExitCode "CLI build failed."
}

Invoke-Step "Publishing flsquad-cli" {
  npm -w packages/squad-cli publish --access public
  Assert-LastExitCode "npm publish failed."
}

Write-Host ""
Write-Host "flsquad-cli published successfully." -ForegroundColor Green
