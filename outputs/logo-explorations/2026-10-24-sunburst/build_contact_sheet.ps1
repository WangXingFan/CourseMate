$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$spec = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'prompts.json') -Raw | ConvertFrom-Json
$bitmap = [System.Drawing.Bitmap]::new(1800, 1450)
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$background = [System.Drawing.ColorTranslator]::FromHtml('#F2F4F0')
$ink = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#142B38'))
$muted = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#65746E'))
$teal = [System.Drawing.SolidBrush]::new([System.Drawing.ColorTranslator]::FromHtml('#087F8C'))
$line = [System.Drawing.Pen]::new([System.Drawing.ColorTranslator]::FromHtml('#DCE2DB'), 1)
$titleFont = [System.Drawing.Font]::new('Microsoft YaHei', 32, [System.Drawing.FontStyle]::Bold)
$subtitleFont = [System.Drawing.Font]::new('Microsoft YaHei', 14)
$nameFont = [System.Drawing.Font]::new('Microsoft YaHei', 20, [System.Drawing.FontStyle]::Bold)
$englishFont = [System.Drawing.Font]::new('Segoe UI', 14)
$numberFont = [System.Drawing.Font]::new('Consolas', 16)
$graphics.Clear($background)
$graphics.DrawLine($line, 55, 38, 1745, 38)
$graphics.DrawString('CourseMate / 课知伴', $titleFont, $ink, 55, 59)
$graphics.DrawString('Logo 候选  ·  六个独立提示词 / 六种设计方向', $subtitleFont, $muted, 59, 122)
$graphics.DrawString('gpt-image-2.5-sunburst  /  2026.10.24', $englishFont, $teal, 1170, 85)
for ($i = 0; $i -lt $spec.concepts.Count; $i++) {
    $concept = $spec.concepts[$i]
    $x = 55 + ($i % 3) * 575
    $y = 195 + [Math]::Floor($i / 3) * 585
    $graphics.FillRectangle([System.Drawing.Brushes]::White, $x, $y, 540, 550)
    $graphics.DrawRectangle($line, $x, $y, 540, 550)
    $source = [System.Drawing.Image]::FromFile((Join-Path $PSScriptRoot $concept.filename))
    try { $graphics.DrawImage($source, [System.Drawing.Rectangle]::new($x + 50, $y + 5, 440, 440)) }
    finally { $source.Dispose() }
    $graphics.DrawLine($line, $x + 24, $y + 450, $x + 516, $y + 450)
    $graphics.DrawString($concept.id, $numberFont, $teal, $x + 25, $y + 472)
    $graphics.DrawString($concept.name, $nameFont, $ink, $x + 73, $y + 463)
    $graphics.DrawString($concept.english_name, $englishFont, $muted, $x + 76, $y + 505)
}
$graphics.DrawString('1254 × 1254 PNG 原始候选与完整提示词已保存；打开 index.html 可逐张放大。', $subtitleFont, $muted, 55, 1380)
$output = Join-Path $PSScriptRoot 'contact-sheet.jpg'
$codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object MimeType -eq 'image/jpeg'
$parameters = [System.Drawing.Imaging.EncoderParameters]::new(1)
$parameters.Param[0] = [System.Drawing.Imaging.EncoderParameter]::new([System.Drawing.Imaging.Encoder]::Quality, [long]94)
$bitmap.Save($output, $codec, $parameters)
$parameters.Dispose()
$graphics.Dispose()
$bitmap.Dispose()
foreach ($item in @($ink, $muted, $teal, $line, $titleFont, $subtitleFont, $nameFont, $englishFont, $numberFont)) { $item.Dispose() }
Write-Output "Saved contact sheet: $output"
