#Requires -Version 5.1
<#
.SYNOPSIS
    把角色卡 JSON 嵌进封面图，生成 SillyTavern 能直接导入的 PNG 角色卡。

.DESCRIPTION
    卡 JSON 先转 UTF-8 再转 base64，写进 PNG 的 tEXt 数据块，关键字 chara（V2）。
    封面里原有的 chara / ccv3 数据块先删掉，其余数据块一字节不动，图片本身不重新编码。
    封面是 JPG / BMP / GIF 时先转成 PNG（这一步会重新编码图片）；WebP 读不了，先自行转格式。
    加 -WithV3 时按酒馆自己导出的做法，再写一份 ccv3：内容同卡，只把 spec / spec_version 改成 V3。
    写完回读一次，确认取出来的卡数据与输入逐字相同。

.PARAMETER Card
    卡 JSON 文件（UTF-8，带不带 BOM 都行）。

.PARAMETER Image
    封面图片：PNG 最好；JPG / BMP / GIF 会先转成 PNG。

.PARAMETER Out
    输出的 .png 路径。已存在时要加 -Force 才覆盖。

.PARAMETER WithV3
    另写一份 ccv3 数据块。只对带 spec 的 V2 / V3 卡有效。

.EXAMPLE
    powershell -NoProfile -ExecutionPolicy Bypass -File embed-png.ps1 -Card .\某角色.json -Image .\封面.png -Out .\某角色.png
#>
param(
    [Parameter(Mandatory = $true)] [string]$Card,
    [Parameter(Mandatory = $true)] [string]$Image,
    [Parameter(Mandatory = $true)] [string]$Out,
    [switch]$WithV3,
    [switch]$Force
)

$ErrorActionPreference = 'Stop'
function Stop-Fatal($m) { Write-Output "ERROR  : $m"; Write-Output 'RESULT : FAIL'; exit 1 }

if (-not ('CardPng' -as [type])) {
Add-Type -Language CSharp -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.IO;
using System.Text;

public static class CardPng
{
    static uint[] table;
    static uint Crc(byte[] type, byte[] data)
    {
        if (table == null)
        {
            table = new uint[256];
            for (uint n = 0; n < 256; n++)
            {
                uint c = n;
                for (int k = 0; k < 8; k++) c = ((c & 1) != 0) ? (0xEDB88320u ^ (c >> 1)) : (c >> 1);
                table[n] = c;
            }
        }
        uint crc = 0xFFFFFFFFu;
        foreach (byte b in type) crc = table[(crc ^ b) & 0xFF] ^ (crc >> 8);
        foreach (byte b in data) crc = table[(crc ^ b) & 0xFF] ^ (crc >> 8);
        return crc ^ 0xFFFFFFFFu;
    }

    static void WriteBE(Stream s, uint v)
    {
        s.WriteByte((byte)(v >> 24)); s.WriteByte((byte)(v >> 16)); s.WriteByte((byte)(v >> 8)); s.WriteByte((byte)v);
    }

    public static bool IsPng(byte[] b)
    {
        byte[] sig = { 137, 80, 78, 71, 13, 10, 26, 10 };
        if (b.Length < 8) return false;
        for (int i = 0; i < 8; i++) if (b[i] != sig[i]) return false;
        return true;
    }

    static string Keyword(byte[] png, int start, int len)
    {
        int end = start;
        while (end < start + len && png[end] != 0) end++;
        if (end == start + len) return null;
        return Encoding.GetEncoding(28591).GetString(png, start, end - start).ToLowerInvariant();
    }

    // 删掉原有的 chara / ccv3 tEXt 块，在 IEND 前插入新块；其余块原样复制。返回被删掉的块数。
    public static byte[] Embed(byte[] png, string[] keywords, string[] payloads, out int removed)
    {
        removed = 0;
        MemoryStream o = new MemoryStream();
        o.Write(png, 0, 8);
        int pos = 8;
        bool sawEnd = false;
        Encoding latin1 = Encoding.GetEncoding(28591);
        while (pos + 12 <= png.Length)
        {
            uint len = ((uint)png[pos] << 24) | ((uint)png[pos + 1] << 16) | ((uint)png[pos + 2] << 8) | png[pos + 3];
            if (pos + 12 + (long)len > png.Length) throw new InvalidDataException("PNG 数据块长度越界，文件可能已损坏");
            string type = latin1.GetString(png, pos + 4, 4);
            if (type == "tEXt")
            {
                string kw = Keyword(png, pos + 8, (int)len);
                if (kw == "chara" || kw == "ccv3") { removed++; pos += 12 + (int)len; continue; }
            }
            if (type == "IEND")
            {
                for (int i = 0; i < keywords.Length; i++)
                {
                    byte[] t = latin1.GetBytes("tEXt");
                    byte[] d = latin1.GetBytes(keywords[i] + "\0" + payloads[i]);
                    WriteBE(o, (uint)d.Length); o.Write(t, 0, 4); o.Write(d, 0, d.Length); WriteBE(o, Crc(t, d));
                }
                sawEnd = true;
            }
            o.Write(png, pos, 12 + (int)len);
            pos += 12 + (int)len;
            if (sawEnd) break;
        }
        if (!sawEnd) throw new InvalidDataException("PNG 没有 IEND 数据块，文件可能已损坏");
        return o.ToArray();
    }

    // 取出指定关键字的 tEXt 值；没有返回 null。
    public static string Extract(byte[] png, string keyword)
    {
        Encoding latin1 = Encoding.GetEncoding(28591);
        int pos = 8;
        while (pos + 12 <= png.Length)
        {
            int len = (png[pos] << 24) | (png[pos + 1] << 16) | (png[pos + 2] << 8) | png[pos + 3];
            string type = latin1.GetString(png, pos + 4, 4);
            if (type == "tEXt" && Keyword(png, pos + 8, len) == keyword)
            {
                string all = latin1.GetString(png, pos + 8, len);
                return all.Substring(all.IndexOf('\0') + 1);
            }
            if (type == "IEND") break;
            pos += 12 + len;
        }
        return null;
    }
}
'@
}

# ---- 卡 JSON ----
if (-not (Test-Path -LiteralPath $Card)) { Stop-Fatal "找不到卡文件：$Card" }
$cardBytes = [System.IO.File]::ReadAllBytes((Resolve-Path -LiteralPath $Card).Path)
$utf8 = New-Object System.Text.UTF8Encoding($false, $true)
try { $text = $utf8.GetString($cardBytes) } catch { Stop-Fatal '卡文件不是合法的 UTF-8' }
if ($text.Length -gt 0 -and $text[0] -eq [char]0xFEFF) { $text = $text.Substring(1) }

Add-Type -AssemblyName System.Web.Extensions
$ser = New-Object System.Web.Script.Serialization.JavaScriptSerializer
$ser.MaxJsonLength = [int]::MaxValue
$ser.RecursionLimit = 1000
try { $obj = $ser.DeserializeObject($text) } catch { Stop-Fatal "卡 JSON 解析失败：$($_.Exception.InnerException.Message)" }
if (-not ($obj -is [System.Collections.Generic.Dictionary[string, object]])) { Stop-Fatal '卡 JSON 的最外层不是对象' }

$hasSpec = $obj.ContainsKey('spec')
if ($hasSpec) {
    if (-not $obj.ContainsKey('data') -or -not ($obj['data'] -is [System.Collections.Generic.Dictionary[string, object]])) { Stop-Fatal '有 spec 但缺 data 对象' }
    if (-not $obj['data'].ContainsKey('name') -or [string]::IsNullOrEmpty([string]$obj['data']['name'])) { Stop-Fatal '缺 data.name' }
    $cardName = [string]$obj['data']['name']
} elseif ($obj.ContainsKey('name') -or $obj.ContainsKey('char_name')) {
    if ($WithV3) { Stop-Fatal '这是没有 spec 的老格式卡，不能加 ccv3；去掉 -WithV3，或先转成 V2' }
    $cardName = if ($obj.ContainsKey('name')) { [string]$obj['name'] } else { [string]$obj['char_name'] }
} else {
    Stop-Fatal '看不出是角色卡：没有 spec，也没有 name / char_name'
}

$keywords = @('chara')
$payloads = @([Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($text)))
if ($WithV3) {
    $obj['spec'] = 'chara_card_v3'
    $obj['spec_version'] = '3.0'
    $v3text = $ser.Serialize($obj)
    $keywords += 'ccv3'
    $payloads += [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($v3text))
}

# ---- 封面 ----
if (-not (Test-Path -LiteralPath $Image)) { Stop-Fatal "找不到封面图片：$Image" }
$imgFull = (Resolve-Path -LiteralPath $Image).Path
$img = [System.IO.File]::ReadAllBytes($imgFull)
$converted = $false
if (-not [CardPng]::IsPng($img)) {
    Add-Type -AssemblyName System.Drawing
    try {
        $ms = New-Object System.IO.MemoryStream(, $img)
        $bmp = [System.Drawing.Image]::FromStream($ms)
        $pngMs = New-Object System.IO.MemoryStream
        $bmp.Save($pngMs, [System.Drawing.Imaging.ImageFormat]::Png)
        $bmp.Dispose(); $ms.Dispose()
        $img = $pngMs.ToArray()
        $converted = $true
    } catch {
        Stop-Fatal '封面不是 PNG，也转换不了（WebP 等格式要先自行转成 PNG 或 JPG）'
    }
}

# ---- 输出路径 ----
if ([System.IO.Path]::GetExtension($Out).ToLowerInvariant() -ne '.png') { Stop-Fatal "输出文件要以 .png 结尾：$Out" }
$outFull = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($Out)
if ((Test-Path -LiteralPath $outFull) -and -not $Force) { Stop-Fatal "输出文件已存在：$outFull（要覆盖就加 -Force）" }
$outDir = Split-Path -Parent $outFull
if (-not (Test-Path -LiteralPath $outDir)) { Stop-Fatal "输出目录不存在：$outDir" }

# ---- 嵌入、写出、回读 ----
$removed = 0
try { $result = [CardPng]::Embed($img, [string[]]$keywords, [string[]]$payloads, [ref]$removed) } catch { Stop-Fatal $_.Exception.InnerException.Message }
[System.IO.File]::WriteAllBytes($outFull, $result)

$back = [System.IO.File]::ReadAllBytes($outFull)
for ($i = 0; $i -lt $keywords.Count; $i++) {
    $got = [CardPng]::Extract($back, $keywords[$i])
    if ($got -ne $payloads[$i]) { Stop-Fatal "回读核对失败：$($keywords[$i]) 数据块与写入内容不一致" }
}
$decoded = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String([CardPng]::Extract($back, 'chara')))
if ($decoded -ne $text) { Stop-Fatal '回读核对失败：chara 解出来的卡与输入 JSON 不一致' }

Write-Output "卡     : $cardName"
Write-Output "封面   : $imgFull$(if ($converted) { '（已转成 PNG）' })"
Write-Output "输出   : $outFull"
Write-Output "数据块 : $($keywords -join ' + ')；删掉封面里原有的卡数据块 $removed 个"
Write-Output "大小   : $([math]::Round($result.Length / 1KB, 1)) KB"
Write-Output '回读   : 卡数据与输入逐字一致'
Write-Output 'RESULT : PASS'
