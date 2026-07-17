# Script to package Next.js + Prisma app for cPanel deployment
# Excludes node_modules to prevent conflict with CloudLinux Node.js Selector symlink.
# Excludes standalone build folder to minimize file size since cPanel handles dependency install.

$zipPath = "deploy.zip"
if (Test-Path $zipPath) {
    Remove-Item $zipPath -Force
}

$stageDir = "deploy_stage"
if (Test-Path $stageDir) {
    Remove-Item $stageDir -Recurse -Force -ErrorAction SilentlyContinue
}

# Wait for file locks
Start-Sleep -Seconds 2
if (Test-Path $stageDir) {
    Remove-Item $stageDir -Recurse -Force -ErrorAction SilentlyContinue
}
New-Item -ItemType Directory -Path $stageDir | Out-Null

Write-Host "[INFO] Copying compiled .next production build (excluding cache, dev, and standalone)..." -ForegroundColor Green
if (Test-Path ".next") {
    New-Item -ItemType Directory -Path "$stageDir/.next" | Out-Null
    Get-ChildItem -Path ".next" -Exclude "cache", "dev", "standalone" | ForEach-Object {
        Copy-Item -Path $_.FullName -Destination "$stageDir/.next/" -Recurse -Force
    }
} else {
    Write-Error "Error: .next folder not found. Please run 'npm run build' first."
    Exit 1
}

Write-Host "[INFO] Copying assets, database schema, migrations and data..." -ForegroundColor Green
# Copy public folder
if (Test-Path "public") {
    Copy-Item -Path "public" -Destination "$stageDir/public" -Recurse -Force
}
# Copy prisma folder
if (Test-Path "prisma") {
    Copy-Item -Path "prisma" -Destination "$stageDir/prisma" -Recurse -Force
}
# Copy scripts folder
if (Test-Path "scripts") {
    Copy-Item -Path "scripts" -Destination "$stageDir/scripts" -Recurse -Force
}
# Copy data folder
if (Test-Path "data") {
    Copy-Item -Path "data" -Destination "$stageDir/data" -Recurse -Force
}
# Copy app/lib (needed for crypto/migration helpers)
if (Test-Path "app/lib") {
    New-Item -ItemType Directory -Path "$stageDir/app/lib" -Force | Out-Null
    Copy-Item -Path "app/lib/*" -Destination "$stageDir/app/lib" -Recurse -Force
}

Write-Host "[INFO] Copying configuration files..." -ForegroundColor Green
$files = @("package.json", "package-lock.json", "server.js", "next.config.mjs", "schema.sql", ".npmrc")
foreach ($file in $files) {
    if (Test-Path $file) {
        Copy-Item -Path $file -Destination $stageDir -Force
    }
}

Write-Host "[INFO] Creating zip archive: $zipPath..." -ForegroundColor Green
[System.Reflection.Assembly]::LoadWithPartialName("System.IO.Compression.FileSystem") | Out-Null
[System.IO.Compression.ZipFile]::CreateFromDirectory($stageDir, $zipPath)

Write-Host "[INFO] Cleaning up temporary staging directory..." -ForegroundColor Green
Start-Sleep -Seconds 1
Remove-Item $stageDir -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "[SUCCESS] deploy.zip created successfully! Ready to upload to cPanel." -ForegroundColor Cyan
