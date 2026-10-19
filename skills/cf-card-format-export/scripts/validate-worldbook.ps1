#Requires -Version 5.1
<#
.SYNOPSIS
    Validate a SillyTavern world book (embedded character_book or standalone World Info file).

.DESCRIPTION
    Mirrors what SillyTavern actually reads (public/scripts/world-info.js ->
    convertCharacterBook / newWorldInfoEntryDefinition). Catches the mistakes that
    silently break a card instead of throwing an error:
      - illegal position / role / selectiveLogic / triggers values
      - snake_case written where the source expects camelCase (selectiveLogic, useProbability)
      - position 4 (@Depth) without depth, position 7 (outlet) without outlet_name
      - secondary_keys present but selective false (filter silently ignored)
      - constant entries that will recursion-bomb the book
      - comment longer than MAX_COMMENT_LENGTH (100)
      - duplicate ids, empty content, empty keys on non-constant entries

.PARAMETER Path
    Path to a .json file: a full character card, an embedded character_book, or a
    standalone World Info file (entries as object).

.EXAMPLE
    .\validate-worldbook.ps1 -Path .\mycard.json
#>
param(
    [Parameter(Mandatory = $true)]
    [string]$Path
)

$ErrorActionPreference = 'Stop'

# ---- source-derived constants (world-info.js / script.js / constants.js) ----
$POSITION_NAMES = @{ 0 = 'before(UpChar)'; 1 = 'after(DownChar)'; 2 = 'ANTop'; 3 = 'ANBottom';
                     4 = 'atDepth'; 5 = 'EMTop'; 6 = 'EMBottom'; 7 = 'outlet' }
$LOGIC_NAMES    = @{ 0 = 'AND_ANY'; 1 = 'NOT_ALL'; 2 = 'NOT_ANY'; 3 = 'AND_ALL' }
$ROLE_NAMES     = @{ 0 = 'SYSTEM'; 1 = 'USER'; 2 = 'ASSISTANT' }
$VALID_TRIGGERS = @('normal', 'continue', 'impersonate', 'swipe', 'regenerate', 'quiet')
$MAX_COMMENT    = 100
$MAX_SCAN_DEPTH = 1000

$errors = New-Object System.Collections.ArrayList
$warns  = New-Object System.Collections.ArrayList
function Add-Err ($m) { [void]$errors.Add($m) }
function Add-Warn($m) { [void]$warns.Add($m) }

# ---- load ----
if (-not (Test-Path -LiteralPath $Path)) { throw "File not found: $Path" }
$raw = Get-Content -LiteralPath $Path -Encoding UTF8 -Raw
try { $json = $raw | ConvertFrom-Json } catch { throw "Invalid JSON: $($_.Exception.Message)" }

$bytes = [System.IO.File]::ReadAllBytes((Resolve-Path -LiteralPath $Path).Path)
if ($bytes.Length -ge 3 -and $bytes[0] -eq 239 -and $bytes[1] -eq 187 -and $bytes[2] -eq 191) {
    Add-Warn 'File has a UTF-8 BOM. SillyTavern tolerates it, but prefer BOM-less UTF-8.'
}

# ---- locate the book ----
$book = $null; $kind = ''
if ($json.data -and $json.data.character_book) { $book = $json.data.character_book; $kind = 'embedded (card -> data.character_book)' }
elseif ($json.character_book)                  { $book = $json.character_book;      $kind = 'embedded (character_book)' }
elseif ($json.entries)                         { $book = $json;                     $kind = 'book root' }
else { throw 'No character_book / entries found.' }

$isStandalone = $book.entries -isnot [System.Array]
$entries = if ($isStandalone) { ($book.entries | Get-Member -MemberType NoteProperty | ForEach-Object { $book.entries.$($_.Name) }) } else { $book.entries }
$fmt = if ($isStandalone) { 'standalone (entries = object, camelCase)' } else { 'embedded (entries = array, snake_case)' }

Write-Output '=============================================='
Write-Output " file   : $Path"
Write-Output " found  : $kind"
Write-Output " format : $fmt"
Write-Output " name   : $($book.name)"
Write-Output " entries: $($entries.Count)"
Write-Output '=============================================='

function Get-Val($entry, $embeddedName, $standaloneName, $inExtensions) {
    if ($isStandalone) { return $entry.$standaloneName }
    if ($inExtensions) {
        if ($null -eq $entry.extensions) { return $null }
        return $entry.extensions.$embeddedName
    }
    return $entry.$embeddedName
}

$seenIds = @{}
$stat = @{ constant = 0; posCount = @{}; recursionBothOff = 0; regexKeys = 0; emptyKeys = 0; totalChars = 0 }

$idx = -1
foreach ($e in $entries) {
    $idx++
    $id = if ($isStandalone) { $e.uid } else { $e.id }
    $tag = "entry[$idx] id=$id"

    # --- id ---
    if ($null -eq $id) { Add-Warn "$tag : no id/uid (import will fall back to array index)" }
    elseif ($seenIds.ContainsKey([string]$id)) { Add-Err "$tag : duplicate id (later entry overwrites the earlier one)" }
    else { $seenIds[[string]$id] = $true }

    # --- keys / content / constant ---
    $keys     = if ($isStandalone) { $e.key } else { $e.keys }
    $content  = $e.content
    $constant = [bool](Get-Val $e 'constant' 'constant' $false)
    if ($constant) { $stat.constant++ }

    $keyCount = @($keys).Count
    if ($keyCount -eq 0) { $stat.emptyKeys++ }
    if ($keyCount -eq 0 -and -not $constant -and -not [string]::IsNullOrWhiteSpace($content)) {
        Add-Warn "$tag : content present but keys empty and constant false -> will NEVER trigger (soft-disabled?)"
    }
    if ([string]::IsNullOrWhiteSpace($content) -and $keyCount -gt 0) {
        Add-Warn "$tag : has keys but empty content -> injects nothing"
    }
    if ($content) { $stat.totalChars += $content.Length }

    foreach ($k in @($keys)) {
        if ($k -match '^/.*/[gimsuy]*$') {
            $stat.regexKeys++
            if ($k -notmatch '^/[\s\S]+/[gimsuy]*$') { Add-Err "$tag : key '$k' looks like a regex but has an illegal flag set (allowed: g i m s u y)" }
        }
        elseif ($k -match '^/' -or $k -match '/$') {
            Add-Warn "$tag : key '$k' starts/ends with '/' but is not a valid /pattern/flags form -> treated as PLAIN TEXT"
        }
    }

    # --- comment ---
    $comment = $e.comment
    if ($comment -and $comment.Length -gt $MAX_COMMENT) {
        Add-Warn "$tag : comment is $($comment.Length) chars, MAX_COMMENT_LENGTH is $MAX_COMMENT -> will be truncated in the UI"
    }

    # --- camelCase traps (embedded format only) ---
    if (-not $isStandalone -and $e.extensions) {
        $extNames = ($e.extensions | Get-Member -MemberType NoteProperty).Name
        if ($extNames -contains 'selective_logic')  { Add-Err "$tag : extensions.selective_logic -> source reads 'selectiveLogic' (camelCase). Value is being ignored." }
        if ($extNames -contains 'use_probability')  { Add-Err "$tag : extensions.use_probability -> source reads 'useProbability' (camelCase). Value is being ignored." }
        if ($extNames -contains 'excludeRecursion') { Add-Err "$tag : extensions.excludeRecursion -> embedded format needs 'exclude_recursion' (snake_case)." }
        if ($extNames -contains 'preventRecursion') { Add-Err "$tag : extensions.preventRecursion -> embedded format needs 'prevent_recursion' (snake_case)." }
    }

    # --- position ---
    $posNum = Get-Val $e 'position' 'position' $true
    if ($isStandalone) { $posNum = $e.position }
    if ($null -eq $posNum) {
        $posStr = $e.position
        if ($posStr -is [string]) {
            if ($posStr -notin @('before_char', 'after_char')) { Add-Err "$tag : top-level position '$posStr' is not 'before_char'/'after_char'" }
            $posNum = if ($posStr -eq 'before_char') { 0 } else { 1 }
            Add-Warn "$tag : no extensions.position -> falls back to top-level string ($posStr = $posNum)"
        } else { $posNum = 0 }
    }
    if ($posNum -isnot [int] -and $posNum -isnot [long] -and $posNum -isnot [double]) {
        Add-Err "$tag : position must be a number in extensions, got '$posNum'"
    } elseif (-not $POSITION_NAMES.ContainsKey([int]$posNum)) {
        Add-Err "$tag : position $posNum is out of range (legal: 0-7)"
    } else {
        $p = [int]$posNum
        $stat.posCount[$p] = 1 + ($stat.posCount[$p] | ForEach-Object { $_ }) 
        # position/string consistency
        if (-not $isStandalone -and $e.position -is [string]) {
            $expected = if ($p -eq 0) { 'before_char' } else { 'after_char' }
            if ($e.position -ne $expected -and $p -le 1) {
                Add-Err "$tag : extensions.position=$p but top-level says '$($e.position)' -> old front-ends will place it differently"
            }
        }
        # depth requirement
        if ($p -eq 4) {
            $depth = Get-Val $e 'depth' 'depth' $true
            if ($null -eq $depth) { Add-Err "$tag : position 4 (@Depth) but no depth value" }
            elseif ([int]$depth -lt 0) { Add-Err "$tag : depth must be >= 0, got $depth" }
        }
        # outlet requirement
        if ($p -eq 7) {
            $on = Get-Val $e 'outlet_name' 'outletName' $true
            if ([string]::IsNullOrWhiteSpace($on)) { Add-Err "$tag : position 7 (outlet) but outlet_name is empty -> unreachable, nothing can call it" }
        }
    }

    # --- role ---
    $role = Get-Val $e 'role' 'role' $true
    if ($null -ne $role -and -not $ROLE_NAMES.ContainsKey([int]$role)) {
        Add-Err "$tag : role $role is illegal (legal: 0=SYSTEM, 1=USER, 2=ASSISTANT)"
    }

    # --- selectiveLogic / secondary_keys ---
    $logic = if ($isStandalone) { $e.selectiveLogic } else { if ($e.extensions) { $e.extensions.selectiveLogic } else { $null } }
    if ($null -ne $logic -and -not $LOGIC_NAMES.ContainsKey([int]$logic)) {
        Add-Err "$tag : selectiveLogic $logic is illegal (legal: 0=AND_ANY, 1=NOT_ALL, 2=NOT_ANY, 3=AND_ALL)"
    }
    $sec = if ($isStandalone) { $e.keysecondary } else { $e.secondary_keys }
    $selective = Get-Val $e 'selective' 'selective' $false
    if (@($sec).Count -gt 0 -and $selective -eq $false) {
        Add-Err "$tag : secondary_keys set but selective=false -> the secondary filter is silently ignored"
    }
    if (@($sec).Count -gt 0 -and $keyCount -eq 0) {
        Add-Warn "$tag : secondary_keys without primary keys -> secondary alone cannot trigger an entry"
    }

    # --- probability ---
    $prob = Get-Val $e 'probability' 'probability' $true
    if ($null -ne $prob -and ([int]$prob -lt 0 -or [int]$prob -gt 100)) { Add-Err "$tag : probability $prob out of range 0-100" }
    $useProb = if ($isStandalone) { $e.useProbability } else { if ($e.extensions) { $e.extensions.useProbability } else { $null } }
    if ($useProb -eq $true -and $null -ne $prob -and [int]$prob -eq 0) { Add-Warn "$tag : useProbability true with probability 0 -> never triggers" }

    # --- triggers ---
    $trig = Get-Val $e 'triggers' 'triggers' $true
    foreach ($t in @($trig)) {
        if ($t -and ($VALID_TRIGGERS -notcontains $t)) { Add-Err "$tag : trigger '$t' is not a valid generation type ($($VALID_TRIGGERS -join '/'))" }
    }

    # --- scan depth ---
    $sd = Get-Val $e 'scan_depth' 'scanDepth' $true
    if ($null -ne $sd -and ([int]$sd -lt 0 -or [int]$sd -gt $MAX_SCAN_DEPTH)) { Add-Err "$tag : scan_depth $sd out of range 0-$MAX_SCAN_DEPTH" }

    # --- recursion bookkeeping ---
    $ex = Get-Val $e 'exclude_recursion' 'excludeRecursion' $true
    $pv = Get-Val $e 'prevent_recursion' 'preventRecursion' $true
    if (-not $ex -and -not $pv) { $stat.recursionBothOff++ }
    if ($constant -and -not $pv) {
        Add-Warn "$tag : constant entry without prevent_recursion -> its content re-scans every turn and can chain-trigger the whole book"
    }

    # --- group ---
    $gw = Get-Val $e 'group_weight' 'groupWeight' $true
    $gp = Get-Val $e 'group' 'group' $true
    if ([string]::IsNullOrWhiteSpace($gp) -and $null -ne $gw -and [int]$gw -ne 100) {
        Add-Warn "$tag : group_weight set but group is empty -> weight does nothing"
    }

    # --- decorators ---
    if ($content -and $content -match '^\s*@@(?!activate|dont_activate)') {
        Add-Warn "$tag : content starts with an unknown @@decorator -> the line is dropped, use @@activate / @@dont_activate"
    }
}

# ---- summary ----
Write-Output ''
Write-Output '--- stats ---'
Write-Output (" constant entries      : {0}" -f $stat.constant)
Write-Output (" regex-style keys      : {0}" -f $stat.regexKeys)
Write-Output (" entries w/ empty keys : {0}" -f $stat.emptyKeys)
Write-Output (" recursion fully open  : {0} / {1}" -f $stat.recursionBothOff, $entries.Count)
Write-Output (" total content chars   : {0:N0}" -f $stat.totalChars)
$posLine = ($stat.posCount.Keys | Sort-Object | ForEach-Object { "$_($($POSITION_NAMES[$_]))=$($stat.posCount[$_])" }) -join '  '
Write-Output (" position spread       : {0}" -f $posLine)

Write-Output ''
if ($errors.Count -eq 0) { Write-Output 'ERRORS : none' }
else { Write-Output "ERRORS : $($errors.Count)"; $errors | ForEach-Object { Write-Output "  [X] $_" } }
if ($warns.Count -eq 0) { Write-Output 'WARNINGS: none' }
else { Write-Output "WARNINGS: $($warns.Count)"; $warns | ForEach-Object { Write-Output "  [!] $_" } }

Write-Output ''
if ($errors.Count -gt 0) { Write-Output 'RESULT : FAIL'; exit 1 }
Write-Output 'RESULT : PASS'
exit 0
