$ErrorActionPreference = 'Stop'
if (Get-Command ollama -ErrorAction SilentlyContinue) {
  Write-Host "Ollama is already installed."
  exit 0
}
$installer = Join-Path $env:TEMP 'OllamaSetup.exe'
Invoke-WebRequest -Uri 'https://ollama.com/download/OllamaSetup.exe' -OutFile $installer
Start-Process -FilePath $installer -Wait
Remove-Item $installer -Force
