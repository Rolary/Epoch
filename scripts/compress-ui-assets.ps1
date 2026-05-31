param(
  [string]$SourceDir = "apps/web/src/assets/ui",
  [string]$OriginalDir = "apps/web/src/assets/original-ui",
  [switch]$RestoreOriginals
)

$ErrorActionPreference = "Stop"
[Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)

Add-Type -AssemblyName System.Drawing

$workspace = (Get-Location).Path
$sourceRoot = [System.IO.Path]::GetFullPath((Join-Path $workspace $SourceDir))
$originalRoot = [System.IO.Path]::GetFullPath((Join-Path $workspace $OriginalDir))

function Test-IsInside([string]$Path, [string]$Root) {
  $fullPath = [System.IO.Path]::GetFullPath($Path)
  $fullRoot = [System.IO.Path]::GetFullPath($Root).TrimEnd([System.IO.Path]::DirectorySeparatorChar) + [System.IO.Path]::DirectorySeparatorChar
  return $fullPath.StartsWith($fullRoot, [System.StringComparison]::OrdinalIgnoreCase)
}

function Get-RelativePathCompat([string]$Root, [string]$Path) {
  $fullRoot = [System.IO.Path]::GetFullPath($Root).TrimEnd([System.IO.Path]::DirectorySeparatorChar, [System.IO.Path]::AltDirectorySeparatorChar)
  $fullPath = [System.IO.Path]::GetFullPath($Path)
  if ($fullPath.Length -le $fullRoot.Length) {
    return [System.IO.Path]::GetFileName($fullPath)
  }
  return $fullPath.Substring($fullRoot.Length + 1)
}

if (!(Test-Path -LiteralPath $sourceRoot)) {
  throw "Source asset directory does not exist: $sourceRoot"
}

if (!(Test-IsInside $sourceRoot $workspace) -or !(Test-IsInside $originalRoot $workspace)) {
  throw "Asset paths must stay inside the workspace."
}

function Copy-TreePng([string]$FromRoot, [string]$ToRoot, [switch]$OnlyMissing) {
  Get-ChildItem -LiteralPath $FromRoot -Recurse -File -Filter *.png | ForEach-Object {
    $relative = Get-RelativePathCompat $FromRoot $_.FullName
    $target = Join-Path $ToRoot $relative
    $targetDir = Split-Path -Parent $target
    if (!(Test-Path -LiteralPath $targetDir)) {
      New-Item -ItemType Directory -Path $targetDir | Out-Null
    }
    if (!$OnlyMissing -or !(Test-Path -LiteralPath $target)) {
      Copy-Item -LiteralPath $_.FullName -Destination $target -Force
    }
  }
}

if ($RestoreOriginals) {
  if (!(Test-Path -LiteralPath $originalRoot)) {
    throw "Original asset directory does not exist: $originalRoot"
  }
  Copy-TreePng -FromRoot $originalRoot -ToRoot $sourceRoot
  Write-Host "Restored UI assets from $OriginalDir"
  exit 0
}

if (!(Test-Path -LiteralPath $originalRoot)) {
  New-Item -ItemType Directory -Path $originalRoot | Out-Null
}

Copy-TreePng -FromRoot $sourceRoot -ToRoot $originalRoot -OnlyMissing

function Get-MaxLongEdge([string]$RelativePath) {
  $normalized = $RelativePath.Replace("\", "/")
  if ($normalized -like "bg-*") { return 1280 }
  if ($normalized -eq "pool-centerpiece.png") { return 720 }
  if ($normalized -like "events/*") { return 720 }
  if ($normalized -like "species/*") { return 720 }
  if ($normalized -like "card-*") { return 520 }
  if ($normalized -like "pickup-*") { return 220 }
  if ($normalized -like "emblem-*") { return 220 }
  if ($normalized -like "evolution/*") { return 220 }
  if ($normalized -like "resource-*") { return 128 }
  return 720
}

function Save-CompressedPng([string]$InputPath, [string]$OutputPath, [int]$MaxLongEdge) {
  $image = [System.Drawing.Image]::FromFile($InputPath)
  try {
    $longEdge = [Math]::Max($image.Width, $image.Height)
    $scale = if ($longEdge -gt $MaxLongEdge) { $MaxLongEdge / $longEdge } else { 1.0 }
    $targetWidth = [Math]::Max(1, [int][Math]::Round($image.Width * $scale))
    $targetHeight = [Math]::Max(1, [int][Math]::Round($image.Height * $scale))

    $bitmap = New-Object System.Drawing.Bitmap $targetWidth, $targetHeight, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    try {
      $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
      try {
        $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.DrawImage($image, 0, 0, $targetWidth, $targetHeight)
      } finally {
        $graphics.Dispose()
      }

      $tempPath = "$OutputPath.tmp"
      $bitmap.Save($tempPath, [System.Drawing.Imaging.ImageFormat]::Png)
      if ((Get-Item -LiteralPath $tempPath).Length -le (Get-Item -LiteralPath $InputPath).Length) {
        Move-Item -LiteralPath $tempPath -Destination $OutputPath -Force
      } else {
        Remove-Item -LiteralPath $tempPath -Force
        Copy-Item -LiteralPath $InputPath -Destination $OutputPath -Force
      }
    } finally {
      $bitmap.Dispose()
    }

    return [pscustomobject]@{
      Width = $targetWidth
      Height = $targetHeight
    }
  } finally {
    $image.Dispose()
  }
}

$beforeBytes = 0L
$afterBytes = 0L
$count = 0

Get-ChildItem -LiteralPath $originalRoot -Recurse -File -Filter *.png | ForEach-Object {
  $relative = Get-RelativePathCompat $originalRoot $_.FullName
  $target = Join-Path $sourceRoot $relative
  $targetDir = Split-Path -Parent $target
  if (!(Test-Path -LiteralPath $targetDir)) {
    New-Item -ItemType Directory -Path $targetDir | Out-Null
  }

  $maxLongEdge = Get-MaxLongEdge $relative
  $sourceBytes = $_.Length
  $size = Save-CompressedPng -InputPath $_.FullName -OutputPath $target -MaxLongEdge $maxLongEdge
  $targetBytes = (Get-Item -LiteralPath $target).Length
  $beforeBytes += $sourceBytes
  $afterBytes += $targetBytes
  $count++

  $savedPercent = if ($sourceBytes -gt 0) { [Math]::Round((1 - ($targetBytes / $sourceBytes)) * 100, 1) } else { 0 }
  Write-Host ("{0} {1}x{2}: {3:N1} KB -> {4:N1} KB ({5}% smaller)" -f $relative, $size.Width, $size.Height, ($sourceBytes / 1KB), ($targetBytes / 1KB), $savedPercent)
}

$totalSaved = if ($beforeBytes -gt 0) { [Math]::Round((1 - ($afterBytes / $beforeBytes)) * 100, 1) } else { 0 }
Write-Host ("Compressed {0} UI asset(s): {1:N1} MB -> {2:N1} MB ({3}% smaller)" -f $count, ($beforeBytes / 1MB), ($afterBytes / 1MB), $totalSaved)
Write-Host "Original assets are kept in $OriginalDir"
