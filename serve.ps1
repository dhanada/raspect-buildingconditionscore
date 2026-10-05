# ============================================================================
# RaSpect BuildingConditionScore — local static frontend server
#
# Serves the static site (index.html, score.html, leads.html, ...) for local
# development. The frontend auto-detects localhost and calls the backend API
# at http://localhost:4000/api (start it separately: cd server && node index.js).
#
# Usage:
#   powershell -ExecutionPolicy Bypass -File serve.ps1 -Port 8099
#   -> http://localhost:8099/
# ============================================================================
param(
  [int]$Port = 8099,
  [string]$Root = $PSScriptRoot
)

$Root = (Resolve-Path $Root).Path

$MimeTypes = @{
  ".html" = "text/html; charset=utf-8"
  ".htm"  = "text/html; charset=utf-8"
  ".css"  = "text/css; charset=utf-8"
  ".js"   = "application/javascript; charset=utf-8"
  ".mjs"  = "application/javascript; charset=utf-8"
  ".json" = "application/json; charset=utf-8"
  ".svg"  = "image/svg+xml"
  ".png"  = "image/png"
  ".jpg"  = "image/jpeg"
  ".jpeg" = "image/jpeg"
  ".gif"  = "image/gif"
  ".webp" = "image/webp"
  ".ico"  = "image/x-icon"
  ".woff" = "font/woff"
  ".woff2"= "font/woff2"
  ".ttf"  = "font/ttf"
  ".txt"  = "text/plain; charset=utf-8"
  ".map"  = "application/json"
}

$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://127.0.0.1:$Port/")
$listener.Start()

Write-Host ""
Write-Host "  RaSpect BuildingConditionScore — static server running"
Write-Host "  URL:      http://127.0.0.1:$Port/"
Write-Host "  Root:     $Root"
Write-Host "  API:      http://localhost:4000/api  (start 'cd server; node index.js' separately)"
Write-Host "  Press Ctrl+C to stop."
Write-Host ""

try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $req = $ctx.Request
    $res = $ctx.Response

    $rel = [Uri]::UnescapeDataString($req.Url.AbsolutePath).TrimStart("/")
    if ($rel -eq "") { $rel = "index.html" }

    # Prevent directory traversal outside the root.
    $full = [System.IO.Path]::GetFullPath((Join-Path $Root $rel))
    if (-not $full.StartsWith($Root, [System.StringComparison]::OrdinalIgnoreCase)) {
      $res.StatusCode = 403
      $res.Close()
      continue
    }

    if (-not (Test-Path -LiteralPath $full -PathType Leaf)) {
      # SPA-less static site: no fallback, just 404 (with a friendly page).
      $res.StatusCode = 404
      $bytes = [System.Text.Encoding]::UTF8.GetBytes("404 - Not found: $rel")
      $res.ContentType = "text/plain; charset=utf-8"
      $res.OutputStream.Write($bytes, 0, $bytes.Length)
      $res.Close()
      continue
    }

    $ext = [System.IO.Path]::GetExtension($full).ToLowerInvariant()
    $res.ContentType = if ($MimeTypes.ContainsKey($ext)) { $MimeTypes[$ext] } else { "application/octet-stream" }
    $bytes = [System.IO.File]::ReadAllBytes($full)
    $res.ContentLength64 = $bytes.LongLength
    $res.OutputStream.Write($bytes, 0, $bytes.Length)
    $res.Close()

    Write-Host ("  {0} {1}" -f $req.HttpMethod, $rel)
  }
} finally {
  $listener.Stop()
}
