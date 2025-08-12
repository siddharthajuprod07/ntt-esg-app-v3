# PowerShell script to fix line endings for Docker files
Write-Host "Fixing line endings for Docker files..." -ForegroundColor Green

# Fix docker-entrypoint.sh
$content = Get-Content ".\docker-entrypoint.sh" -Raw
$content = $content -replace "`r`n", "`n"
[System.IO.File]::WriteAllText(".\docker-entrypoint.sh", $content)

Write-Host "Line endings fixed!" -ForegroundColor Green
Write-Host "You can now run: docker-compose up --build" -ForegroundColor Yellow