. "$PSScriptRoot\nvmrcShim.ps1"

Set-Location -Path ".\src-quasar"

Use-Nvmrc

bun install
