
:: _release.bat
@echo off
setlocal enabledelayedexpansion

REM =================================================================
REM Release Script
REM
REM Creates a new version tag and pushes it to the remote repository.
REM
REM Usage:
REM   _release.bat        (for a normal minor release, e.g., v0.1.0 -> v0.2.0)
REM   _release.bat -pre   (for a pre-release, e.g., v0.1.0 -> v0.1.0.1-pre)
REM =================================================================

REM --- Pre-flight Check ---
REM Check if the working directory is clean before we start.
git diff-index --quiet HEAD --
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] You have uncommitted changes.
    echo Please commit or stash them before creating a release.
    echo.
    exit /b 1
)
echo Current branch is clean. Proceeding...

REM --- Determine Release Mode ---
REM Default mode is a 'minor' release.
set "RELEASE_MODE=minor"
REM If the first argument is '-pre', switch to pre-release mode.
if /i "%1"=="-pre" (
    set "RELEASE_MODE=pre"
)
echo Releasing in '%RELEASE_MODE%' mode...

REM --- Update Version and Generate Tag ---
REM This script uses PowerShell to safely read and write the JSON file.
REM It's the most reliable way on modern Windows without external tools.
for /f "delims=" %%i in ('powershell -NoProfile -ExecutionPolicy Bypass -Command ^
    $versionFilePath = ".\version.json"; ^
    try { ^
        $version = Get-Content -Path $versionFilePath -Raw | ConvertFrom-Json; ^
    } catch { ^
        Write-Host "[ERROR] Failed to read or parse version.json." -ForegroundColor Red; ^
        exit 1; ^
    } ^
    $releaseMode = "%RELEASE_MODE%"; ^
    if ($releaseMode -eq "pre") { ^
        $version.build = [int]$version.build + 1; ^
        $version.pre = $true; ^
        $newTag = "v$($version.main).$($version.major).$($version.minor).$($version.build)-pre"; ^
    } else { ^
        $version.minor = [int]$version.minor + 1; ^
        $version.build = 0; ^
        $version.pre = $false; ^
        $newTag = "v$($version.main).$($version.major).$($version.minor)"; ^
    } ^
    try { ^
        $version | ConvertTo-Json | Set-Content -Path $versionFilePath -Encoding utf8; ^
    } catch { ^
        Write-Host "[ERROR] Failed to write to version.json." -ForegroundColor Red; ^
        exit 1; ^
    } ^
    Write-Output $newTag; ^
') do (
    set "NEW_TAG=%%i"
)

REM Check if the tag was successfully generated.
if not defined NEW_TAG (
    echo.
    echo [FATAL] Failed to generate new tag.
    echo Please check if version.json exists and if PowerShell is working correctly.
    echo.
    exit /b 1
)

echo.
echo Updated version.json.
echo The new tag will be: %NEW_TAG%
echo.

REM --- Execute Git Commands ---
echo Committing version update...
git add version.json
git commit -m "chore(release): bump version to %NEW_TAG%"
if %errorlevel% neq 0 (
    echo [ERROR] Git commit failed. Aborting.
    exit /b 1
)

echo Creating git tag...
git tag %NEW_TAG%
if %errorlevel% neq 0 (
    echo [ERROR] Git tag creation failed. Aborting.
    exit /b 1
)

echo.
echo Pushing commit and tag to remote repository...
git push
git push origin %NEW_TAG%

if %errorlevel% neq 0 (
    echo [ERROR] Failed to push to remote. Please check your connection and permissions.
    echo You may need to push manually:
    echo   git push
    echo   git push origin %NEW_TAG%
    exit /b 1
)

echo.
echo =================================================
echo  Release process completed successfully!
echo  Tag '%NEW_TAG%' has been created and pushed.
echo =================================================
echo.

endlocal