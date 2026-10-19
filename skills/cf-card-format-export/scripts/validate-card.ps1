#Requires -Version 5.1
<#
.SYNOPSIS
    校验 SillyTavern 角色卡外层字段（Character Card V2 / V3，JSON 或 PNG）。

.DESCRIPTION
    按规范原文与酒馆导入行为检查卡的外层：spec、data、各字段类型、extensions、
    depth_prompt、开场白、示例对话分段。PNG 按酒馆顺序取 ccv3 优先、其次 chara。
    不检查 character_book 内部的条目配置。

.PARAMETER Path
    .json 或 .png 文件路径。

.EXAMPLE
    powershell -NoProfile -ExecutionPolicy Bypass -File validate-card.ps1 -Path .\某角色.json
#>
param(
    [Parameter(Mandatory = $true)]
    [string]$Path
)

$ErrorActionPreference = 'Stop'

$errors = New-Object System.Collections.ArrayList
$warns  = New-Object System.Collections.ArrayList
function Add-Err ($m) { [void]$errors.Add($m) }
function Add-Warn($m) { [void]$warns.Add($m) }

function Test-Obj($v)  { return ($v -is [System.Management.Automation.PSCustomObject]) }
function Test-Arr($v)  { return ($v -is [array]) }
function Test-Num($v)  { return ($v -is [int] -or $v -is [long] -or $v -is [double] -or $v -is [decimal]) }
function Stop-Fatal($m) { Write-Output "ERROR  : $m"; Write-Output 'RESULT : FAIL'; exit 1 }
function Has($o, $k)   { return ($null -ne $o) -and (@($o.PSObject.Properties.Name) -contains $k) }

if (-not (Test-Path -LiteralPath $Path)) { Stop-Fatal "找不到文件：$Path" }
$full  = (Resolve-Path -LiteralPath $Path).Path
$bytes = [System.IO.File]::ReadAllBytes($full)
$ext   = [System.IO.Path]::GetExtension($full).ToLowerInvariant()
$source = ''
$raw = $null

if ($ext -eq '.png') {
    $sig = [byte[]](137,80,78,71,13,10,26,10)
    for ($i = 0; $i -lt 8; $i++) { if ($bytes[$i] -ne $sig[$i]) { Stop-Fatal '不是 PNG 文件（文件头不对）' } }
    $latin1 = [System.Text.Encoding]::GetEncoding(28591)
    $found = @{}
    $pos = 8
    while ($pos + 8 -le $bytes.Length) {
        $len  = ([int]$bytes[$pos] -shl 24) -bor ([int]$bytes[$pos+1] -shl 16) -bor ([int]$bytes[$pos+2] -shl 8) -bor [int]$bytes[$pos+3]
        $type = $latin1.GetString($bytes, $pos + 4, 4)
        if ($type -eq 'tEXt' -and $len -gt 0) {
            $chunk = $latin1.GetString($bytes, $pos + 8, $len)
            $nul = $chunk.IndexOf([char]0)
            if ($nul -gt 0) {
                $kw = $chunk.Substring(0, $nul).ToLowerInvariant()
                if ($kw -eq 'chara' -or $kw -eq 'ccv3') { $found[$kw] = $chunk.Substring($nul + 1) }
            }
        }
        if ($type -eq 'IEND') { break }
        $pos += 12 + $len
    }
    if ($found.ContainsKey('ccv3'))      { $source = 'PNG ccv3 数据块'; $b64 = $found['ccv3'] }
    elseif ($found.ContainsKey('chara')) { $source = 'PNG chara 数据块'; $b64 = $found['chara'] }
    else { Stop-Fatal 'PNG 里没有 chara 或 ccv3 数据块，酒馆会拒绝导入' }
    try { $raw = [System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($b64.Trim())) }
    catch { Stop-Fatal "$source 不是合法的 base64：$($_.Exception.Message)" }
    if ($found.ContainsKey('ccv3') -and $found.ContainsKey('chara')) {
        try {
            $a = ([System.Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($found['chara'].Trim())) | ConvertFrom-Json).data
            $b = ($raw | ConvertFrom-Json).data
            if (($a | ConvertTo-Json -Depth 50 -Compress) -ne ($b | ConvertTo-Json -Depth 50 -Compress)) {
                Add-Warn 'PNG 里 chara 和 ccv3 两块的 data 内容不同；酒馆只读 ccv3'
            }
        } catch { Add-Warn 'PNG 里 chara 数据块解析失败；酒馆只读 ccv3，不影响导入' }
    }
} else {
    $source = 'JSON 文件'
    if ($bytes.Length -ge 3 -and $bytes[0] -eq 239 -and $bytes[1] -eq 187 -and $bytes[2] -eq 191) {
        Add-Warn '文件带 UTF-8 BOM；建议存成不带 BOM 的 UTF-8'
        $raw = [System.Text.Encoding]::UTF8.GetString($bytes, 3, $bytes.Length - 3)
    } else {
        $raw = [System.Text.Encoding]::UTF8.GetString($bytes)
    }
}

try { $card = $raw | ConvertFrom-Json } catch { Stop-Fatal "JSON 解析失败：$($_.Exception.Message)" }

# ---- spec ----
$ver = 0
if (-not (Has $card 'spec')) {
    if (Has $card 'name')          { Add-Err '没有 spec 字段：酒馆会按老的 V1 格式导入，V2 字段全部丢失。补上 spec / spec_version / data' }
    elseif (Has $card 'char_name') { Add-Err '这是 Pygmalion 格式（char_name），不是 V2/V3 卡' }
    elseif (Has $card 'entries')   { Add-Err '这是独立世界书文件，不是角色卡' }
    else                           { Add-Err '没有 spec 字段，也不是可识别的老格式' }
} elseif ($card.spec -eq 'chara_card_v2') {
    $ver = 2
    if ($card.spec_version -ne '2.0') { Add-Warn "spec_version 应为 ""2.0""，现为 ""$($card.spec_version)""" }
} elseif ($card.spec -eq 'chara_card_v3') {
    $ver = 3
    if ($card.spec_version -ne '3.0') { Add-Warn "spec_version 应为 ""3.0""，现为 ""$($card.spec_version)""" }
} else {
    Add-Err "spec 不认识：""$($card.spec)""，应为 chara_card_v2 或 chara_card_v3"
}

$d = $null
if ($ver -gt 0) {
    if (-not (Has $card 'data') -or -not (Test-Obj $card.data)) { Add-Err '缺 data 对象' } else { $d = $card.data }
}

if ($null -ne $d) {
    # ---- name ----
    if (-not (Has $d 'name') -or -not ($d.name -is [string]) -or [string]::IsNullOrWhiteSpace($d.name)) {
        Add-Err 'data.name 缺失或为空'
    } elseif ((Has $card 'name') -and ($card.name -ne $d.name)) {
        Add-Warn "外层 name（$($card.name)）和 data.name（$($d.name)）不一致；酒馆以 data.name 为准"
    }

    # ---- 字符串字段 ----
    $strFields = @('description','personality','scenario','first_mes','mes_example','creator_notes',
                   'system_prompt','post_history_instructions','creator','character_version')
    foreach ($k in $strFields) {
        if (-not (Has $d $k)) { Add-Warn "缺 data.$k（规范要求，空也写空串）" }
        elseif ($null -ne $d.$k -and -not ($d.$k -is [string])) { Add-Err "data.$k 应为字符串" }
    }

    # ---- 数组字段 ----
    if (-not (Has $d 'alternate_greetings')) { Add-Warn '缺 data.alternate_greetings（空也写 []）' }
    elseif ($d.alternate_greetings -is [string]) { Add-Warn 'alternate_greetings 写成了字符串；酒馆会包成一条，建议改成数组' }
    elseif (-not (Test-Arr $d.alternate_greetings)) { Add-Err 'alternate_greetings 应为字符串数组' }
    else {
        $i = 0
        foreach ($g in $d.alternate_greetings) { if (-not ($g -is [string])) { Add-Err "alternate_greetings[$i] 不是字符串" }; $i++ }
    }
    if (-not (Has $d 'tags')) { Add-Warn '缺 data.tags（空也写 []）' }
    elseif (-not (Test-Arr $d.tags)) { Add-Err 'data.tags 应为字符串数组' }

    # ---- 开场白 ----
    $altCount = 0
    if (Test-Arr $d.alternate_greetings) { $altCount = @($d.alternate_greetings | Where-Object { $_ -is [string] -and $_.Trim() }).Count }
    if ([string]::IsNullOrWhiteSpace([string]$d.first_mes) -and $altCount -eq 0) { Add-Warn '首条开场白和备选开场白全空，开聊时角色不会先说话' }

    # ---- 示例对话：本工作流不用 ----
    if (-not [string]::IsNullOrWhiteSpace([string]$d.mes_example)) {
        Add-Warn 'mes_example 有内容；本工作流不用这个字段，台词语料放进角色设定或世界书条目'
    }

    # ---- 酒馆旧字段：本工作流不写----
    foreach ($k in @('creator_notes', 'post_history_instructions')) {
        if (-not [string]::IsNullOrWhiteSpace([string]$d.$k)) { Add-Warn "$k 有内容；本工作流不写这个字段，留空" }
    }
    if ((Test-Arr $d.tags) -and @($d.tags).Count -gt 0) { Add-Warn 'tags 有内容；本工作流不写酒馆标签，留空 []' }

    # ---- extensions ----
    if (-not (Has $d 'extensions')) { Add-Err '缺 data.extensions（必须是对象，默认 {}）' }
    elseif (-not (Test-Obj $d.extensions)) { Add-Err 'data.extensions 必须是对象' }
    else {
        $e = $d.extensions
        if (Has $e 'depth_prompt') {
            $dp = $e.depth_prompt
            if (-not (Test-Obj $dp)) { Add-Err 'extensions.depth_prompt 必须是对象' }
            else {
                if ((Has $dp 'prompt') -and $null -ne $dp.prompt -and -not ($dp.prompt -is [string])) { Add-Err 'depth_prompt.prompt 应为字符串' }
                if (Has $dp 'depth') {
                    $n = $null
                    if (-not [double]::TryParse([string]$dp.depth, [ref]$n) -or $n -lt 0) { Add-Err "depth_prompt.depth 应为不小于 0 的数字，现为 ""$($dp.depth)""" }
                }
                if ((Has $dp 'role') -and @('system','user','assistant') -notcontains [string]$dp.role) {
                    Add-Err "depth_prompt.role 只能是 system / user / assistant，现为 ""$($dp.role)"""
                }
            }
        }
        if ((Has $e 'talkativeness') -and $null -ne $e.talkativeness) {
            $t = $null
            if (-not [double]::TryParse([string]$e.talkativeness, [ref]$t) -or $t -lt 0 -or $t -gt 1) { Add-Warn "extensions.talkativeness 应在 0 到 1 之间，现为 ""$($e.talkativeness)""" }
        }
        if ((Has $e 'world') -and -not [string]::IsNullOrWhiteSpace([string]$e.world)) {
            Add-Warn "卡绑定了外部世界书「$($e.world)」；导入卡不会带上那本书，要另外导入"
        }
    }

    # ---- character_book ----
    if ((Has $d 'character_book') -and $null -ne $d.character_book) {
        $cb = $d.character_book
        if (-not (Test-Obj $cb)) { Add-Err 'character_book 必须是对象' }
        elseif (-not (Has $cb 'entries') -or -not (Test-Arr $cb.entries)) { Add-Err 'character_book 缺 entries 数组' }
    }

    # ---- V3 ----
    if ($ver -eq 3) {
        foreach ($k in 'creation_date','modification_date') {
            if ((Has $d $k) -and $null -ne $d.$k -and -not (Test-Num $d.$k)) { Add-Err "data.$k 应为秒级时间戳数字" }
        }
        if ((Has $d 'assets') -and $null -ne $d.assets -and -not (Test-Arr $d.assets)) { Add-Err 'data.assets 应为数组' }
    }
}

# ---- 报告 ----
Write-Output "文件   : $full"
Write-Output "来源   : $source"
if ($ver -gt 0) { Write-Output "版本   : V$ver" }
if ($null -ne $d) {
    $alt = 0; if (Test-Arr $d.alternate_greetings) { $alt = @($d.alternate_greetings).Count }
    $ent = 0; if ((Has $d 'character_book') -and (Test-Obj $d.character_book) -and (Test-Arr $d.character_book.entries)) { $ent = @($d.character_book.entries).Count }
    Write-Output "角色   : $($d.name)"
    Write-Output "开场白 : 首条 $([int](-not [string]::IsNullOrWhiteSpace([string]$d.first_mes))) 条，备选 $alt 条"
    Write-Output "世界书 : $ent 条（内部未检查）"
}
foreach ($m in $errors) { Write-Output "ERROR  : $m" }
foreach ($m in $warns)  { Write-Output "WARN   : $m" }
if ($errors.Count -gt 0) { Write-Output 'RESULT : FAIL'; exit 1 }
Write-Output 'RESULT : PASS'
