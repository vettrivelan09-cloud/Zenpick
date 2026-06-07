# Zenpick — AI Model Downloader
# Run this script ONCE to download the Real-ESRGAN ONNX model for local serving.
# After downloading, the model is served from /models/ with zero CORS or auth issues.

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Zenpick AI Model Downloader" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$modelDir = Join-Path $PSScriptRoot "models"
$modelFile = Join-Path $modelDir "realesrgan-x4plus.onnx"

# Check if already downloaded
if (Test-Path $modelFile) {
    $size = (Get-Item $modelFile).Length
    if ($size -gt 1000000) {
        Write-Host "[OK] Model already exists ($([math]::Round($size / 1MB, 1)) MB). No download needed." -ForegroundColor Green
        Write-Host ""
        exit 0
    } else {
        Write-Host "[!] Existing model file is corrupted ($size bytes). Re-downloading..." -ForegroundColor Yellow
    }
}

# Create models directory
New-Item -ItemType Directory -Force -Path $modelDir | Out-Null
Write-Host "[1/2] Created models/ directory" -ForegroundColor Gray

# Download URLs — ordered by reliability
$urls = @(
    "https://huggingface.co/AXERA-TECH/Real-ESRGAN/resolve/main/onnx/realesrgan-x4.onnx",
    "https://huggingface.co/qualcomm/Real-ESRGAN-x4plus/resolve/main/Real-ESRGAN-x4plus.onnx",
    "https://github.com/xinntao/Real-ESRGAN/releases/download/v0.2.5.0/realesr-general-x4v3.pth"
)

$downloaded = $false
foreach ($url in $urls) {
    Write-Host "[2/2] Downloading from: $url" -ForegroundColor Gray
    Write-Host "      This may take a few minutes (~67 MB)..." -ForegroundColor DarkGray
    try {
        # Use curl.exe (ships with Windows 10+) for better redirect/TLS handling
        $curlPath = Get-Command curl.exe -ErrorAction SilentlyContinue
        if ($curlPath) {
            Write-Host "      Using curl.exe for download..." -ForegroundColor DarkGray
            & curl.exe -L -f -o $modelFile $url --progress-bar
            if ($LASTEXITCODE -ne 0) {
                throw "curl.exe returned exit code $LASTEXITCODE"
            }
        } else {
            # Fallback to Invoke-WebRequest
            [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
            Invoke-WebRequest -Uri $url -OutFile $modelFile -UseBasicParsing
        }

        if (Test-Path $modelFile) {
            $finalSize = (Get-Item $modelFile).Length
            if ($finalSize -gt 1000000) {
                $downloaded = $true
                Write-Host ""
                Write-Host "[SUCCESS] Model downloaded! ($([math]::Round($finalSize / 1MB, 1)) MB)" -ForegroundColor Green
                break
            } else {
                Write-Host "[!] Download returned a tiny file ($finalSize bytes), trying next source..." -ForegroundColor Yellow
                Remove-Item $modelFile -Force -ErrorAction SilentlyContinue
            }
        }
    } catch {
        Write-Host "[!] Failed: $($_.Exception.Message)" -ForegroundColor Yellow
        Write-Host "    Trying next source..." -ForegroundColor DarkGray
        Remove-Item $modelFile -Force -ErrorAction SilentlyContinue
    }
}

if (-not $downloaded) {
    Write-Host ""
    Write-Host "[FAILED] Could not download the model from any source." -ForegroundColor Red
    Write-Host ""
    Write-Host "Manual download option:" -ForegroundColor Yellow
    Write-Host "  1. Open: https://huggingface.co/AXERA-TECH/Real-ESRGAN/tree/main/onnx" -ForegroundColor White
    Write-Host "  2. Click the download icon next to 'realesrgan-x4.onnx' (67 MB)" -ForegroundColor White
    Write-Host "  3. Save the file to: $modelFile" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host ""
Write-Host "You can now start the server with .\serve.ps1" -ForegroundColor Cyan
Write-Host "The AI upscaling engine will load the model from /models/ automatically." -ForegroundColor Cyan
Write-Host ""
