
# _release.ps1
<#
.SYNOPSIS
    Automates the versioning and release tagging process.

.DESCRIPTION
    This script reads version.json, increments the version, commits the change,
    and creates and pushes a new git tag.

.PARAMETER pre
    If specified, creates a pre-release by incrementing the 'build' number.
    Otherwise, creates a minor release by incrementing the 'minor' number.

.EXAMPLE
    # For a minor release (e.g., v0.1.0 -> v0.2.0)
    .\_release.ps1

.EXAMPLE
    # For a pre-release (e.g., v0.1.0 -> v0.1.0.1-pre)
    .\_release.ps1 -pre
#>
[CmdletBinding()]
param (
    [Switch]$pre
)

# --- Configuration ---
$VersionFilePath = ".\version.json"
$ErrorActionPreference = "Stop" # Exit script on any error

# --- Pre-flight Check ---
Write-Host "Checking for uncommitted changes..."
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Host "[ERROR] You have uncommitted changes. Please commit or stash them first." -ForegroundColor Red
    exit 1
}
Write-Host "Current branch is clean. Proceeding..."

# --- Determine Release Mode ---
if ($pre) {
    $ReleaseMode = "pre"
}
else {
    $ReleaseMode = "minor"
}
Write-Host "Releasing in '$ReleaseMode' mode..."

# --- Read and Update Version ---
try {
    $version = Get-Content -Path $VersionFilePath -Raw | ConvertFrom-Json
}
catch {
    Write-Host "[ERROR] Failed to read or parse $VersionFilePath." -ForegroundColor Red
    exit 1
}

if ($ReleaseMode -eq "pre") {
    $version.build = [int]$version.build + 1
    $version.pre = $true
    $NewTag = "v$($version.main).$($version.major).$($version.minor).$($version.build)-pre"
}
else {
    $version.minor = [int]$version.minor + 1
    $version.build = 0
    $version.pre = $false
    $NewTag = "v$($version.main).$($version.major).$($version.minor)"
}

# --- Write Updated Version Back to File ---
try {
    # The [PSCustomObject] cast ensures correct key order in the JSON file.
    $outputObject = [PSCustomObject]@{
        main = $version.main
        major = $version.major
        minor = $version.minor
        build = $version.build
        pre = $version.pre
    }
    $outputObject | ConvertTo-Json | Set-Content -Path $VersionFilePath -Encoding utf8
    Write-Host "Updated $VersionFilePath. New tag will be: $NewTag" -ForegroundColor Green
}
catch {
    Write-Host "[ERROR] Failed to write to $VersionFilePath." -ForegroundColor Red
    exit 1
}

# --- Execute Git Commands ---
try {
    Write-Host "Committing version update..."
    git add $VersionFilePath
    git commit -m "chore(release): bump version to $NewTag"

    Write-Host "Creating git tag..."
    git tag $NewTag

    Write-Host "Pushing commit and tag to remote repository..."
    git push
    git push origin $NewTag
}
catch {
    Write-Host "[ERROR] A git command failed. Please check the output above." -ForegroundColor Red
    Write-Host "You may need to clean up manually (e.g., git reset, git tag -d)." -ForegroundColor Yellow
    exit 1
}

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host " Release process completed successfully!" -ForegroundColor Cyan
Write-Host " Tag '$NewTag' has been created and pushed." -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan
