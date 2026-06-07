$port = 8080
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()
Write-Host "Server running at http://localhost:$port/"
Write-Host "COOP/COEP headers enabled for SharedArrayBuffer support"
Write-Host "Press Ctrl+C to stop"

$webRoot = $PSScriptRoot

$mimeTypes = @{
    '.html' = 'text/html'
    '.css'  = 'text/css'
    '.js'   = 'application/javascript'
    '.json' = 'application/json'
    '.png'  = 'image/png'
    '.jpg'  = 'image/jpeg'
    '.jpeg' = 'image/jpeg'
    '.gif'  = 'image/gif'
    '.svg'  = 'image/svg+xml'
    '.webp' = 'image/webp'
    '.ico'  = 'image/x-icon'
    '.mp4'  = 'video/mp4'
    '.webm' = 'video/webm'
    '.woff2'= 'font/woff2'
    '.wasm' = 'application/wasm'
}

try {
    while ($listener.IsListening) {
        try {
            $context = $listener.GetContext()
            $request = $context.Request
            $response = $context.Response

            # Add COOP/COEP headers for SharedArrayBuffer (required for multi-threaded FFmpeg.wasm)
            $response.Headers.Add("Cross-Origin-Opener-Policy", "same-origin")
            $response.Headers.Add("Cross-Origin-Embedder-Policy", "require-corp")
            $response.Headers.Add("Cross-Origin-Resource-Policy", "cross-origin")

            $path = $request.Url.LocalPath
            if ($path -eq '/') { $path = '/index.html' }

            $filePath = Join-Path $webRoot ($path.TrimStart('/'))

            if (Test-Path $filePath -PathType Leaf) {
                $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
                $contentType = if ($mimeTypes.ContainsKey($ext)) { $mimeTypes[$ext] } else { 'application/octet-stream' }
                $response.ContentType = $contentType
                $bytes = [System.IO.File]::ReadAllBytes($filePath)
                $response.ContentLength64 = $bytes.Length
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            } else {
                $response.StatusCode = 404
                $msg = [System.Text.Encoding]::UTF8.GetBytes("Not Found")
                $response.OutputStream.Write($msg, 0, $msg.Length)
            }
            $response.Close()
            Write-Host "$($request.HttpMethod) $($request.Url.LocalPath) -> $($response.StatusCode)"
        } catch {
            Write-Host "Error processing request: $($_.Exception.Message)"
        }
    }
} finally {
    $listener.Stop()
}
