param(
  [switch]$SkipLint,
  [switch]$SkipTests,
  [switch]$SkipSdkCheck,
  [switch]$PublishSdkFirst,
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

function Ensure-NpmAuth() {
  npm whoami --registry https://registry.npmjs.org/
  if ($LASTEXITCODE -eq 0) {
    return
  }

  Write-Host ""
  Write-Host "npm auth not found for registry.npmjs.org." -ForegroundColor Yellow
  $answer = Read-Host "Run 'npm login' now? (y/N)"
  if ($answer -notin @('y', 'Y', 'yes', 'YES', 'Yes')) {
    throw "npm auth check failed. Run 'npm login' for registry.npmjs.org."
  }

  npm login --registry https://registry.npmjs.org/
  Assert-LastExitCode "npm login failed."

  npm whoami --registry https://registry.npmjs.org/
  Assert-LastExitCode "npm auth check failed after login."
}

function Get-RegistryDisplayName([string]$RegistryUrl) {
  if ($RegistryUrl -match 'npm\.pkg\.github\.com') {
    return 'GitHub Packages'
  }

  if ($RegistryUrl -match 'registry\.npmjs\.org') {
    return 'npmjs'
  }

  return $RegistryUrl
}

$repoRoot = Split-Path -Parent $PSScriptRoot
Set-Location $repoRoot

$env:NPM_CONFIG_CACHE = $CacheDir
$env:NPM_CONFIG_USERCONFIG = Join-Path $env:USERPROFILE ".npmrc"

$cliPkgPath = Join-Path $repoRoot "packages/squad-cli/package.json"
$sdkPkgPath = Join-Path $repoRoot "packages/squad-sdk/package.json"
$cliPkg = Get-Content $cliPkgPath -Raw | ConvertFrom-Json
$sdkPkg = Get-Content $sdkPkgPath -Raw | ConvertFrom-Json
$sdkVersion = [string]$cliPkg.dependencies."@bradygaster/squad-sdk"
$sdkRegistry = if ($sdkPkg.publishConfig.registry) {
  [string]$sdkPkg.publishConfig.registry
} else {
  "https://registry.npmjs.org/"
}
$sdkRegistryName = Get-RegistryDisplayName $sdkRegistry

if ($cliPkg.name -ne "flsquad-cli") {
  throw "CLI package name is '$($cliPkg.name)'. Expected 'flsquad-cli'."
}

Invoke-Step "Checking npm auth" {
  Ensure-NpmAuth
}

if (-not $SkipSdkCheck) {
  Invoke-Step "Checking $sdkRegistryName visibility for @bradygaster/squad-sdk@$sdkVersion" {
    npm view "@bradygaster/squad-sdk@$sdkVersion" version --registry $sdkRegistry
    Assert-LastExitCode "SDK version $sdkVersion is not available on $sdkRegistryName ($sdkRegistry). Publish the SDK there first or rerun with -SkipSdkCheck if you knowingly use a different registry."
  }
}

if ($PublishSdkFirst) {
  Invoke-Step "Publishing @bradygaster/squad-sdk to $sdkRegistryName" {
    npm -w packages/squad-sdk publish --access public
    Assert-LastExitCode "SDK publish failed."
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
