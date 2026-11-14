$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

npm test
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

npm run build
exit $LASTEXITCODE
