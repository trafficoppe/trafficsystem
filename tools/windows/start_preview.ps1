# tools/windows/start_preview.ps1 - open the Preview over local HTTP on Windows (no install needed; not a deployment)
# Listens on this computer only:  http://localhost:8765/dist/preview.html   (close this window or press Ctrl+C to stop)
# Usage: double-click START_PREVIEW_WINDOWS.bat   (or: powershell -ExecutionPolicy Bypass -File tools\windows\start_preview.ps1 [-Port 8765] [-NoOpen])
param([int]$Port = 8765, [switch]$NoOpen)
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
$page = 'dist/preview.html'
if (-not (Test-Path (Join-Path $root $page))) { Write-Host "Not found: $page - extract the whole folder first."; exit 1 }
$types = @{ '.html' = 'text/html; charset=utf-8'; '.js' = 'text/javascript; charset=utf-8'; '.css' = 'text/css; charset=utf-8'; '.json' = 'application/json; charset=utf-8'; '.svg' = 'image/svg+xml'; '.png' = 'image/png'; '.jpg' = 'image/jpeg'; '.jpeg' = 'image/jpeg'; '.webp' = 'image/webp'; '.ico' = 'image/x-icon'; '.woff2' = 'font/woff2'; '.txt' = 'text/plain; charset=utf-8'; '.md' = 'text/plain; charset=utf-8' }
$listener = $null
foreach ($p in $Port..($Port + 9)) {
  try { $l = New-Object System.Net.HttpListener; $l.Prefixes.Add("http://localhost:$p/"); $l.Start(); $listener = $l; $Port = $p; break } catch { }
}
if (-not $listener) { Write-Host "Ports $Port-$($Port + 9) are busy."; exit 1 }
$url = "http://localhost:$Port/$page"
Write-Host "Preview ready:  $url"
Write-Host "(this computer only - close this window to stop)"
if (-not $NoOpen) { Start-Process $url }
$rootFull = [System.IO.Path]::GetFullPath($root).TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar
try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext(); $res = $ctx.Response
    try {
      $rel = [System.Uri]::UnescapeDataString($ctx.Request.Url.AbsolutePath).TrimStart('/')
      if ($rel -eq '') { $rel = $page }
      $full = [System.IO.Path]::GetFullPath((Join-Path $root $rel))
      $res.Headers['Cache-Control'] = 'no-store'; $res.Headers['X-Content-Type-Options'] = 'nosniff'
      if ($ctx.Request.HttpMethod -ne 'GET' -and $ctx.Request.HttpMethod -ne 'HEAD') { $res.StatusCode = 405 }
      elseif (-not $full.StartsWith($rootFull) -or -not (Test-Path $full -PathType Leaf)) { $res.StatusCode = 404 }
      else {
        $ext = [System.IO.Path]::GetExtension($full).ToLower()
        if ($types.ContainsKey($ext)) { $res.ContentType = $types[$ext] } else { $res.ContentType = 'application/octet-stream' }
        $bytes = [System.IO.File]::ReadAllBytes($full); $res.ContentLength64 = $bytes.Length
        if ($ctx.Request.HttpMethod -eq 'GET') { $res.OutputStream.Write($bytes, 0, $bytes.Length) }
      }
    } catch { try { $res.StatusCode = 500 } catch { } }
    finally { try { $res.Close() } catch { } }
  }
} finally { $listener.Stop(); $listener.Close() }
