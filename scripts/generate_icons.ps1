[Reflection.Assembly]::LoadWithPartialName("System.Drawing") | Out-Null

$sourcePath = (Resolve-Path "public\favicon.png").Path
$srcBmp = [System.Drawing.Bitmap]::FromFile($sourcePath)

$resDir = "android\app\src\main\res"

$configs = @(
    @{ Folder = "mipmap-mdpi";    LauncherSize = 48;  ForegroundSize = 108 },
    @{ Folder = "mipmap-hdpi";    LauncherSize = 72;  ForegroundSize = 162 },
    @{ Folder = "mipmap-xhdpi";   LauncherSize = 96;  ForegroundSize = 216 },
    @{ Folder = "mipmap-xxhdpi";  LauncherSize = 144; ForegroundSize = 324 },
    @{ Folder = "mipmap-xxxhdpi"; LauncherSize = 192; ForegroundSize = 432 }
)

function Resize-Image($src, $w, $h) {
    $dest = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($dest)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    $g.DrawImage($src, 0, 0, $w, $h)
    $g.Dispose()
    return $dest
}

function Create-Foreground($src, $size) {
    $dest = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($dest)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    
    # Scale icon to 78% of the canvas to fit perfectly inside the adaptive safe zone
    $innerSize = [int]($size * 0.78)
    $offset = [int](($size - $innerSize) / 2)
    
    $g.DrawImage($src, $offset, $offset, $innerSize, $innerSize)
    $g.Dispose()
    return $dest
}

function Create-Round($src, $size) {
    $dest = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($dest)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)
    
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $path.AddEllipse(0, 0, $size, $size)
    $g.SetClip($path)
    $g.DrawImage($src, 0, 0, $size, $size)
    $path.Dispose()
    $g.Dispose()
    return $dest
}

foreach ($c in $configs) {
    $targetDir = Join-Path $resDir $c.Folder
    
    # 1. ic_launcher.png
    $launcher = Resize-Image $srcBmp $c.LauncherSize $c.LauncherSize
    $launcherPath = Join-Path $targetDir "ic_launcher.png"
    $launcher.Save($launcherPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $launcher.Dispose()
    Write-Output "Saved $launcherPath ($($c.LauncherSize)x$($c.LauncherSize))"
    
    # 2. ic_launcher_round.png
    $round = Create-Round $srcBmp $c.LauncherSize
    $roundPath = Join-Path $targetDir "ic_launcher_round.png"
    $round.Save($roundPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $round.Dispose()
    Write-Output "Saved $roundPath ($($c.LauncherSize)x$($c.LauncherSize))"
    
    # 3. ic_launcher_foreground.png
    $fg = Create-Foreground $srcBmp $c.ForegroundSize
    $fgPath = Join-Path $targetDir "ic_launcher_foreground.png"
    $fg.Save($fgPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $fg.Dispose()
    Write-Output "Saved $fgPath ($($c.ForegroundSize)x$($c.ForegroundSize))"
}

$srcBmp.Dispose()
Write-Output "All Android icons generated successfully!"
