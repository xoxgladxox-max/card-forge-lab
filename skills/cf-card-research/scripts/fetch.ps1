<#
fetch.ps1 — 用本机真实 Chrome 抓网页（headless），存 HTML 和去标签后的正文。

用法：
  powershell -ExecutionPolicy Bypass -File fetch.ps1 -Url "<网址>" -Out "<存哪，不带扩展名>"
  遇到要人工点的验证页：加 -Headed，弹出窗口点完后关掉窗口，cookie 留在 profile 里，接着自动走 headless 抓取。

输出：<Out>.html（完整 DOM）、<Out>.txt（剥标签后的正文）。
退出码：0 成功；1 失败（Chrome 找不到、超时、抓回空页）。
#>
param(
    [Parameter(Mandatory = $true)][string]$Url,
    [Parameter(Mandatory = $true)][string]$Out,
    [int]$Budget = 8000,
    [int]$TimeoutSec = 60,
    [switch]$Headed,
    [string]$Profile = (Join-Path $env:LOCALAPPDATA 'cf-card-research\chrome-profile'),
    [string]$Chrome = 'C:\Program Files\Google\Chrome\Application\chrome.exe',
    [string]$UserAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
)

$ErrorActionPreference = 'Stop'
function Fail([string]$msg) { Write-Output "ERROR  : $msg"; Write-Output 'RESULT : FAIL'; exit 1 }

if (-not (Test-Path -LiteralPath $Chrome)) {
    $alt = Join-Path ${env:ProgramFiles(x86)} 'Google\Chrome\Application\chrome.exe'
    if (Test-Path -LiteralPath $alt) { $Chrome = $alt } else { Fail "找不到 Chrome：$Chrome（用 -Chrome 指定路径）" }
}
if (-not (Test-Path -LiteralPath $Profile)) { New-Item -ItemType Directory -Path $Profile -Force | Out-Null }
$full = [IO.Path]::GetFullPath($Out)
$outDir = Split-Path -Parent $full
if ($outDir -and -not (Test-Path -LiteralPath $outDir)) { New-Item -ItemType Directory -Path $outDir -Force | Out-Null }
$htmlPath = $full + '.html'
$txtPath  = $full + '.txt'

# PS 5.1 的 Start-Process 不会给含空格的参数加引号，这里自己包
function Q([string]$s) { '"' + $s.Replace('"', '\"') + '"' }

# ---- 人工过验证 ----
if ($Headed) {
    Write-Output '已打开 Chrome 窗口：完成验证后关闭这个窗口，脚本接着抓取。'
    $hargs = @("--user-data-dir=$(Q $Profile)", "--user-agent=$(Q $UserAgent)", '--no-first-run', '--new-window', (Q $Url))
    $hp = Start-Process -FilePath $Chrome -ArgumentList $hargs -PassThru
    $hp.WaitForExit()
}

# ---- headless 抓取 ----
# 用 Process 类直接读标准输出；关掉崩溃上报，否则它的常驻进程会继承输出句柄，读不到结尾
$cargs = @(
    '--headless=new', '--disable-gpu', '--no-first-run', '--hide-scrollbars', '--mute-audio',
    '--disable-breakpad', '--disable-crash-reporter',
    "--user-data-dir=$(Q $Profile)",
    "--user-agent=$(Q $UserAgent)",
    "--virtual-time-budget=$Budget",
    '--dump-dom',
    (Q $Url)
) -join ' '
$psi = New-Object Diagnostics.ProcessStartInfo $Chrome
$psi.Arguments = $cargs
$psi.UseShellExecute = $false
$psi.RedirectStandardOutput = $true
$psi.RedirectStandardError = $true
$psi.StandardOutputEncoding = [Text.Encoding]::UTF8
$p = [Diagnostics.Process]::Start($psi)
$readOut = $p.StandardOutput.ReadToEndAsync()
$null = $p.StandardError.ReadToEndAsync()
if (-not $p.WaitForExit($TimeoutSec * 1000)) {
    try { $p.Kill() } catch {}
    Fail "超时（$TimeoutSec 秒）；可调大 -TimeoutSec，或检查网络"
}
if (-not $readOut.Wait(10000)) { Fail '读不到 Chrome 的输出（输出流一直没有结束）' }
$html = $readOut.Result
if ([string]::IsNullOrWhiteSpace($html)) {
    Fail '抓回空页。可能是 profile 被另一个 Chrome 占用、网址打不开，或需要 -Headed 过验证'
}

# ---- 剥标签取正文 ----
$t = $html
$t = [regex]::Replace($t, '(?is)<(script|style|noscript|template|svg)\b.*?</\1\s*>', ' ')
$t = [regex]::Replace($t, '(?is)<!--.*?-->', ' ')
$t = [regex]::Replace($t, '(?i)<br\s*/?>', "`n")
$t = [regex]::Replace($t, '(?i)</(p|div|li|tr|h[1-6]|section|article|dd|dt|blockquote|pre|table|ul|ol)\s*>', "`n")
$t = [regex]::Replace($t, '(?i)</t[dh]\s*>', "`t")
$t = [regex]::Replace($t, '(?s)<[^>]+>', '')
$t = [System.Net.WebUtility]::HtmlDecode($t)
$t = [regex]::Replace($t, '[ \t\u00a0\u3000]+', ' ')
$t = [regex]::Replace($t, ' ?\n ?', "`n")
$t = [regex]::Replace($t, '\n{3,}', "`n`n").Trim()

$utf8 = New-Object Text.UTF8Encoding $false
[IO.File]::WriteAllText($htmlPath, $html, $utf8)
[IO.File]::WriteAllText($txtPath, $t, $utf8)

$title = ''
$m = [regex]::Match($html, '(?is)<title[^>]*>(.*?)</title>')
if ($m.Success) { $title = [System.Net.WebUtility]::HtmlDecode($m.Groups[1].Value).Trim() }

Write-Output "标题   : $title"
Write-Output "HTML   : $htmlPath（$($html.Length) 字符）"
Write-Output "正文   : $txtPath（$($t.Length) 字符）"
if ($title -match '(?i)Just a moment|Attention Required|Access denied|Verify you are human|しばらくお待ちください' -or ($t.Length -lt 3000 -and $html -match '(?i)cf-challenge|challenge-platform|captcha')) {
    Write-Output 'WARN   : 页面像是验证页；加 -Headed 人工过一次再抓'
}
elseif ($t.Length -lt 200) {
    Write-Output 'WARN   : 正文很短，可能没渲染完；可调大 -Budget（毫秒）'
}
Write-Output 'RESULT : PASS'
exit 0
