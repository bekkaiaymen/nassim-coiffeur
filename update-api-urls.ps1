# Script to update API URLs for production deployment
# Run this before deploying to production

Write-Host "🔄 Updating API URLs for production..." -ForegroundColor Cyan
Write-Host ""

# Backend URL on Render (update this after deploying to Render)
$BACKEND_URL = "https://nassim-backend.onrender.com"

Write-Host "Backend URL: $BACKEND_URL" -ForegroundColor Yellow
Write-Host ""

# Files to update
$files = @(
    "public\nassim\nassim.js",
    "public\nassim-owner\nassim-owner.js",
    "public\customer-register\customer-register.js",
    "public\book-now\script.js",
    "api-client.js"
)

$count = 0

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "📝 Updating $file..." -ForegroundColor Green
        
        # Read file content
        $content = Get-Content $file -Raw
        
        # Replace localhost URLs
        $content = $content -replace "http://localhost:3000", $BACKEND_URL
        $content = $content -replace "http://127.0.0.1:3000", $BACKEND_URL
        
        # Save updated content
        Set-Content $file -Value $content -NoNewline
        
        $count++
    } else {
        Write-Host "⚠️  File not found: $file" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "✅ Updated $count files successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Test locally: npm start" -ForegroundColor White
Write-Host "2. Commit changes: git add . && git commit -m 'Update API URLs for production'" -ForegroundColor White
Write-Host "3. Push to GitHub: git push" -ForegroundColor White
Write-Host ""
