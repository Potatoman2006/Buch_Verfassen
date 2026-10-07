[CmdletBinding()]
param(
    [switch]$Execute,
    [string]$RepoRoot = (Split-Path -Parent $PSScriptRoot)
)

# Preview is the default. Moving a directory on the same volume preserves all
# contents, including hidden files, local modifications, and ignored files.
# No deletion, Git reset, cleanup, or recursive copy is performed.
$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$archiveName = '_superseded_2026-09-05'
$relativeSources = @(
    'codex_version',
    'Gemini_AI_Author',
    'legacy_story_world',
    'old_stuff',
    'stories/the_vampire_of_deepcall_light',
    'worldbuilding',
    'readme.md',
    'requirements.txt'
)
$root = [IO.Path]::GetFullPath((Resolve-Path -LiteralPath $RepoRoot).ProviderPath).TrimEnd('\', '/')
$archiveParent = [IO.Path]::GetFullPath((Join-Path $root 'archive'))
$archiveRoot = [IO.Path]::GetFullPath((Join-Path $archiveParent $archiveName))

function Assert-ChildPath {
    param([string]$Path, [string]$Parent)
    $fullPath = [IO.Path]::GetFullPath($Path)
    $parentPrefix = [IO.Path]::GetFullPath($Parent).TrimEnd('\', '/') + [IO.Path]::DirectorySeparatorChar
    if (-not $fullPath.StartsWith($parentPrefix, [StringComparison]::OrdinalIgnoreCase)) {
        throw "Path leaves the approved directory: $fullPath (parent: $Parent)"
    }
    return $fullPath
}

function Assert-NotReparsePoint {
    param([string]$Path)
    if (Test-Path -LiteralPath $Path) {
        $item = Get-Item -LiteralPath $Path -Force
        if (($item.Attributes -band [IO.FileAttributes]::ReparsePoint) -ne 0) {
            throw "Refusing a reparse point: $Path"
        }
    }
}

function Assert-NoReparseAncestors {
    param([string]$Path)
    $current = [IO.Path]::GetFullPath($Path)
    while ($current -ne $root) {
        $null = Assert-ChildPath -Path $current -Parent $root
        Assert-NotReparsePoint -Path $current
        $current = Split-Path -Parent $current
    }
    Assert-NotReparsePoint -Path $root
}

function Get-RepoRelativePath {
    param([string]$Path)
    return $Path.Substring($root.Length + 1).Replace('\', '/')
}

function Write-ArchiveManifest {
    param([object]$Manifest, [string]$Path)
    $checkedPath = Assert-ChildPath -Path $Path -Parent $archiveParent
    $Manifest | ConvertTo-Json -Depth 10 | Set-Content -LiteralPath $checkedPath -Encoding utf8
}

Assert-NotReparsePoint -Path $root
Assert-NotReparsePoint -Path $archiveParent
$null = Assert-ChildPath -Path $archiveParent -Parent $root
$null = Assert-ChildPath -Path $archiveRoot -Parent $archiveParent
if (Test-Path -LiteralPath $archiveRoot) {
    throw "Archive destination already exists. Inspect its manifest before continuing: $archiveRoot"
}

$sourceEntries = [Collections.Generic.List[object]]::new()
$hashEntries = [Collections.Generic.List[object]]::new()
$authoredExtensions = @('.md', '.txt', '.json', '.yaml', '.yml', '.toml', '.py', '.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx', '.html', '.css', '.svg', '.ps1', '.tex')
$ignoredHashDirectoryPattern = '(^|/)(node_modules|\.git|\.next|\.cache|\.vite|__pycache__|\.venv|venv|dist|build)(/|$)'
$sensitiveNamePattern = '(^|/)(secrets?)(/|$)|(^|/)(\.env[^/]*|[^/]*(credential|secret|private[_-]?key|access[_-]?token)[^/]*)$'

foreach ($relativeSource in $relativeSources) {
    $source = Assert-ChildPath -Path (Join-Path $root $relativeSource) -Parent $root
    $destination = Assert-ChildPath -Path (Join-Path $archiveRoot $relativeSource) -Parent $archiveRoot
    Assert-NoReparseAncestors -Path $source
    Assert-NoReparseAncestors -Path $destination
    if (-not (Test-Path -LiteralPath $source)) {
        throw "Expected archive source is missing: $source"
    }
    Assert-NotReparsePoint -Path $source
    $item = Get-Item -LiteralPath $source -Force
    if ($item.PSIsContainer) {
        $reparsePoints = @(Get-ChildItem -LiteralPath $source -Recurse -Force -Attributes ReparsePoint)
        if ($reparsePoints.Count -ne 0) {
            throw "Source contains reparse points; review before moving: $source"
        }
        $files = @(Get-ChildItem -LiteralPath $source -Recurse -Force -File)
    } else {
        $files = @($item)
    }
    $totalBytes = 0L
    $selectedCount = 0
    foreach ($file in $files) {
        $totalBytes += $file.Length
        $relativeFile = Get-RepoRelativePath -Path $file.FullName
        $isAuthored = $authoredExtensions -contains $file.Extension.ToLowerInvariant()
        $isDependency = $relativeFile -match $ignoredHashDirectoryPattern
        $isSensitive = $relativeFile -match $sensitiveNamePattern
        if ($isAuthored -and -not $isDependency -and -not $isSensitive) {
            $hashEntries.Add([ordered]@{
                source = $relativeFile
                archived = "archive/$archiveName/$relativeFile"
                bytes = $file.Length
                lastWriteTimeUtc = $file.LastWriteTimeUtc.ToString('o')
                sha256 = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash.ToLowerInvariant()
            })
            $selectedCount++
        }
    }
    $sourceEntries.Add([ordered]@{
        source = $relativeSource
        destination = "archive/$archiveName/$relativeSource"
        kind = $(if ($item.PSIsContainer) { 'directory' } else { 'file' })
        files = $files.Count
        bytes = $totalBytes
        authoredFilesHashed = $selectedCount
        moveStatus = 'pending'
    })
}

$gitStatus = @(& git -C $root status --short --untracked-files=normal 2>$null)
if ($LASTEXITCODE -ne 0) { throw 'Could not record the current Git status.' }
$trackedFiles = @(& git -C $root ls-files 2>$null)
if ($LASTEXITCODE -ne 0) { throw 'Could not record the tracked-file inventory.' }
$archivedTrackedFiles = @($trackedFiles | Where-Object {
    $trackedPath = $_
    @($relativeSources | Where-Object {
        $trackedPath -eq $_ -or $trackedPath.StartsWith($_ + '/', [StringComparison]::OrdinalIgnoreCase)
    }).Count -gt 0
})
$allSourceFiles = 0L
$allSourceBytes = 0L
foreach ($sourceEntry in $sourceEntries) {
    $allSourceFiles += $sourceEntry.files
    $allSourceBytes += $sourceEntry.bytes
}

$manifest = [ordered]@{
    schemaVersion = 1
    createdAtUtc = [DateTime]::UtcNow.ToString('o')
    repositoryRoot = $root
    archiveRoot = "archive/$archiveName"
    status = 'planned'
    authorization = 'User requested archiving superseded drafts and worlds outside the active project structure; no permanent deletion.'
    activeCanon = @('world', 'atlas', 'stories/five_years_of_night')
    excludedRoots = @('.git', '.agents', '.idea', 'venv', 'tmp', 'tools', 'world', 'atlas', 'stories/five_years_of_night')
    hashPolicy = 'SHA-256 for selected authored text/code/SVG files; dependency/build directories and secret/environment filenames excluded from content reads. All source contents are preserved by directory moves regardless of hash selection.'
    totalFiles = $allSourceFiles
    totalBytes = $allSourceBytes
    authoredFilesHashed = $hashEntries.Count
    gitStatusBeforeMove = $gitStatus
    trackedFilesInArchiveScope = $archivedTrackedFiles
    sources = $sourceEntries.ToArray()
    hashes = $hashEntries.ToArray()
    verification = $null
    failure = $null
}

if (-not (Test-Path -LiteralPath $archiveParent)) {
    $null = New-Item -ItemType Directory -Path $archiveParent
}
if (-not $Execute) {
    $planPath = Join-Path $archiveParent 'archive_plan_2026-09-05.json'
    Write-ArchiveManifest -Manifest $manifest -Path $planPath
    [pscustomobject]@{
        status = 'preview_only_no_sources_moved'
        files = $manifest.totalFiles
        bytes = $manifest.totalBytes
        authoredFilesHashed = $manifest.authoredFilesHashed
        manifest = $planPath
        execute = 'pwsh -NoProfile -File ./tools/archive_legacy.ps1 -Execute'
    } | ConvertTo-Json
    return
}

$null = New-Item -ItemType Directory -Path $archiveRoot
$manifestPath = Join-Path $archiveRoot 'manifest.json'
$manifest.status = 'moving'
Write-ArchiveManifest -Manifest $manifest -Path $manifestPath
try {
    foreach ($entry in $sourceEntries) {
        # Recheck resolved absolute paths immediately before each filesystem move.
        $source = Assert-ChildPath -Path (Join-Path $root $entry.source) -Parent $root
        $destination = Assert-ChildPath -Path (Join-Path $root $entry.destination) -Parent $archiveRoot
        Assert-NoReparseAncestors -Path $source
        Assert-NoReparseAncestors -Path $destination
        Assert-NotReparsePoint -Path $source
        Assert-NotReparsePoint -Path $archiveParent
        Assert-NotReparsePoint -Path $archiveRoot
        if (Test-Path -LiteralPath $destination) { throw "Destination already exists: $destination" }
        $destinationParent = Split-Path -Parent $destination
        if ($destinationParent -ne $archiveRoot) {
            $null = Assert-ChildPath -Path $destinationParent -Parent $archiveRoot
            Assert-NotReparsePoint -Path $destinationParent
            if (-not (Test-Path -LiteralPath $destinationParent)) {
                $null = New-Item -ItemType Directory -Path $destinationParent -Force
            }
        }
        Move-Item -LiteralPath $source -Destination $destination
        $entry.moveStatus = 'moved'
        Write-ArchiveManifest -Manifest $manifest -Path $manifestPath
    }
    foreach ($entry in $sourceEntries) {
        $destination = Assert-ChildPath -Path (Join-Path $root $entry.destination) -Parent $archiveRoot
        $archivedFiles = @(
            if ($entry.kind -eq 'directory') {
                Get-ChildItem -LiteralPath $destination -Recurse -Force -File
            } else {
                Get-Item -LiteralPath $destination -Force
            }
        )
        $archivedBytes = ($archivedFiles | Measure-Object -Property Length -Sum).Sum
        if ($archivedFiles.Count -ne $entry.files -or $archivedBytes -ne $entry.bytes) {
            throw "Archived file count or byte total differs: $($entry.destination)"
        }
    }
    foreach ($entry in $hashEntries) {
        $archivedPath = Assert-ChildPath -Path (Join-Path $root $entry.archived) -Parent $archiveRoot
        $actualHash = (Get-FileHash -LiteralPath $archivedPath -Algorithm SHA256).Hash.ToLowerInvariant()
        if ($actualHash -ne $entry.sha256) { throw "Archived content hash differs: $($entry.archived)" }
    }
    $manifest.status = 'complete'
    $manifest.verification = [ordered]@{
        completedAtUtc = [DateTime]::UtcNow.ToString('o')
        sourceCountsAndBytesMatch = $true
        authoredHashesMatch = $true
        verifiedAuthoredFiles = $hashEntries.Count
        originalSourcePathsAbsent = @($relativeSources | Where-Object { Test-Path -LiteralPath (Join-Path $root $_) }).Count -eq 0
    }
    Write-ArchiveManifest -Manifest $manifest -Path $manifestPath
} catch {
    $manifest.status = 'incomplete_review_manifest_before_continuing'
    $manifest.failure = $_.Exception.Message
    Write-ArchiveManifest -Manifest $manifest -Path $manifestPath
    throw
}
[pscustomobject]@{
    status = $manifest.status
    files = $manifest.totalFiles
    bytes = $manifest.totalBytes
    verifiedAuthoredFiles = $hashEntries.Count
    manifest = $manifestPath
} | ConvertTo-Json
