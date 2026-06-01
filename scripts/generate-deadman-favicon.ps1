# Generates Dead Man–style favicon (pale face, X eyes) for jarmusch.am
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$imgDir = Join-Path $PSScriptRoot '..\images'
$baseName = 'favicon-deadman'

function New-DeadManFavicon([int]$size) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.Clear([System.Drawing.Color]::FromArgb(255, 12, 10, 8))

    $faceW = [int]($size * 0.72)
    $faceH = [int]($size * 0.88)
    $faceX = [int](($size - $faceW) / 2)
    $faceY = [int]($size * 0.08)
    $faceRect = New-Object System.Drawing.Rectangle $faceX, $faceY, $faceW, $faceH

    $faceBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 198, 178, 148))
    $g.FillEllipse($faceBrush, $faceRect)
    $faceBrush.Dispose()

    $hairH = [int]($size * 0.28)
    $hairBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 28, 22, 18))
    $hairRect = New-Object System.Drawing.Rectangle ($faceX - 2), $faceY, ($faceW + 4), $hairH
    $g.FillEllipse($hairBrush, $hairRect)
    $g.FillRectangle($hairBrush, ($faceX - 2), ($faceY + $hairH / 2), ($faceW + 4), ($hairH / 2))
    $hairBrush.Dispose()

    $shadowBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(60, 80, 60, 50))
    $noseW = [int]($size * 0.08)
    $noseH = [int]($size * 0.22)
    $noseX = [int]($size / 2 - $noseW / 2)
    $noseY = [int]($faceY + $faceH * 0.42)
    $g.FillEllipse($shadowBrush, $noseX, $noseY, $noseW, $noseH)
    $shadowBrush.Dispose()

    $penW = [Math]::Max(2, [int]($size * 0.09))
    $eyePen = New-Object System.Drawing.Pen ([System.Drawing.Color]::White), $penW
    $eyePen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $eyePen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round

    $eyeY = [int]($faceY + $faceH * 0.36)
    $eyeSpan = [int]($faceW * 0.22)
    $cx = [int]($size / 2)
    $xSize = [int]($eyeSpan * 0.55)

    foreach ($side in @(-1, 1)) {
        $ex = $cx + $side * [int]($faceW * 0.22)
        $g.DrawLine($eyePen, ($ex - $xSize), ($eyeY - $xSize), ($ex + $xSize), ($eyeY + $xSize))
        $g.DrawLine($eyePen, ($ex - $xSize), ($eyeY + $xSize), ($ex + $xSize), ($eyeY - $xSize))
    }
    $eyePen.Dispose()

    $lipY = [int]($faceY + $faceH * 0.72)
    $lipPen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(120, 90, 75, 65)), ([Math]::Max(1, [int]($size * 0.04)))
    $lipW = [int]($faceW * 0.35)
    $g.DrawLine($lipPen, ($cx - $lipW / 2), $lipY, ($cx + $lipW / 2), $lipY)
    $lipPen.Dispose()

    $g.Dispose()
    return $bmp
}

function Save-Png([System.Drawing.Bitmap]$bmp, [string]$path) {
    $bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
}

function Save-Ico([System.Drawing.Bitmap]$bmp32, [string]$path) {
  # Minimal ICO: single 32x32 32bpp
  $ms = New-Object System.IO.MemoryStream
  $bmp32.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
  $png = $ms.ToArray()
  $ms.Dispose()

  $fs = [System.IO.File]::Create($path)
  $bw = New-Object System.IO.BinaryWriter $fs
  $bw.Write([uint16]0)
  $bw.Write([uint16]1)
  $bw.Write([uint16]1)
  $bw.Write([byte]32)
  $bw.Write([byte]32)
  $bw.Write([byte]0)
  $bw.Write([byte]0)
  $bw.Write([uint16]1)
  $bw.Write([uint16]32)
  $bw.Write([uint32]$png.Length)
  $bw.Write([uint32]22)
  $bw.Write($png)
  $bw.Close()
  $fs.Close()
}

$sizes = @{ '32' = 32; '192' = 192; '180' = 180 }
foreach ($key in $sizes.Keys) {
    $s = $sizes[$key]
    $bmp = New-DeadManFavicon $s
    $out = Join-Path $imgDir "${baseName}-${key}.png"
    Save-Png $bmp $out
    Write-Host "Wrote $out"
    if ($key -eq '32') { $bmp32 = $bmp.Clone() }
    $bmp.Dispose()
}

$icoPath = Join-Path $imgDir 'favicon-deadman.ico'
Save-Ico $bmp32 $icoPath
$bmp32.Dispose()
Write-Host "Wrote $icoPath"
