param([ValidateSet('setup', 'start', 'build')][string]$Action = 'start')
$ErrorActionPreference = 'Stop'
$env:PATHEXT = ((@('.COM', '.EXE', '.BAT', '.CMD') + ($env:PATHEXT -split ';')) | Where-Object { $_ } | Select-Object -Unique) -join ';'
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [Console]::OutputEncoding
$taskRoot = Split-Path -Parent $PSScriptRoot
$taskVersion = (Get-Content -Raw (Join-Path $taskRoot '.bun-version')).Trim()
$taskArchitecture = if ($env:PROCESSOR_ARCHITECTURE -eq 'ARM64' -or $env:PROCESSOR_ARCHITEW6432 -eq 'ARM64') { 'aarch64' } else { 'x64-baseline' }
$taskAsset = "bun-windows-$taskArchitecture"
$taskBun = Join-Path $taskRoot ".runtime\$taskAsset\bun.exe"

function Test-TaskBun([string]$Executable) {
    try {
        $taskInfo = New-Object System.Diagnostics.ProcessStartInfo
        $taskInfo.FileName = $Executable
        $taskInfo.Arguments = '--version'
        $taskInfo.UseShellExecute = $false
        $taskInfo.CreateNoWindow = $true
        $taskInfo.RedirectStandardOutput = $true
        $taskInfo.RedirectStandardError = $true
        $taskProcess = [System.Diagnostics.Process]::Start($taskInfo)
        $taskOutput = $taskProcess.StandardOutput.ReadToEnd().Trim()
        $taskProcess.StandardError.ReadToEnd() | Out-Null
        $taskProcess.WaitForExit()
        $taskValid = $taskProcess.ExitCode -eq 0 -and $taskOutput -eq $taskVersion
        $taskProcess.Dispose()
        return $taskValid
    }
    catch { return $false }
}

function Invoke-TaskBun([string]$Script) {
    # Explicitly wait even when the Windows runtime uses the GUI PE subsystem.
    $taskInfo = New-Object System.Diagnostics.ProcessStartInfo
    $taskInfo.FileName = $taskBun
    $taskInfo.Arguments = $Script
    $taskInfo.WorkingDirectory = $taskRoot
    $taskInfo.UseShellExecute = $false
    $taskInfo.CreateNoWindow = $true
    $taskInfo.RedirectStandardOutput = $true
    $taskInfo.RedirectStandardError = $true
    $taskInfo.StandardOutputEncoding = [System.Text.Encoding]::UTF8
    $taskInfo.StandardErrorEncoding = [System.Text.Encoding]::UTF8
    $taskProcess = [System.Diagnostics.Process]::Start($taskInfo)
    try {
        $taskOutput = $taskProcess.StandardOutput.ReadLineAsync()
        $taskError = $taskProcess.StandardError.ReadLineAsync()
        while ($null -ne $taskOutput -or $null -ne $taskError) {
            $taskRead = $false
            if ($null -ne $taskOutput -and $taskOutput.IsCompleted) {
                $taskLine = $taskOutput.Result
                if ($null -eq $taskLine) { $taskOutput = $null }
                else { Write-Host $taskLine; $taskOutput = $taskProcess.StandardOutput.ReadLineAsync() }
                $taskRead = $true
            }
            if ($null -ne $taskError -and $taskError.IsCompleted) {
                $taskLine = $taskError.Result
                if ($null -eq $taskLine) { $taskError = $null }
                else { [Console]::Error.WriteLine($taskLine); $taskError = $taskProcess.StandardError.ReadLineAsync() }
                $taskRead = $true
            }
            if (-not $taskRead) { Start-Sleep -Milliseconds 30 }
        }
        $taskProcess.WaitForExit()
        return $taskProcess.ExitCode
    } finally {
        if (-not $taskProcess.HasExited) { & taskkill.exe /PID $taskProcess.Id /T /F | Out-Null }
        $taskProcess.Dispose()
    }
}

try {
    if (-not (Test-TaskBun $taskBun)) {
        $taskInstalled = Get-Command bun.exe -ErrorAction SilentlyContinue
        if ($taskInstalled -and (Test-TaskBun $taskInstalled.Source)) {
            $taskBun = $taskInstalled.Source
        } else {
            $taskRuntime = Join-Path $taskRoot '.runtime'
            New-Item -ItemType Directory -Force -Path $taskRuntime | Out-Null
            $taskTemp = Join-Path $taskRuntime ('download-' + [Guid]::NewGuid().ToString('N'))
            New-Item -ItemType Directory -Path $taskTemp | Out-Null
            try {
                [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
                $taskArchive = Join-Path $taskTemp "$taskAsset.zip"
                $taskUrl = "https://github.com/oven-sh/bun/releases/download/bun-v$taskVersion/$taskAsset.zip"
                Write-Host "Downloading Bun $taskVersion for Windows..."
                $taskPreviousProgress = $ProgressPreference
                $ProgressPreference = 'SilentlyContinue'
                try { Invoke-WebRequest -UseBasicParsing -Uri $taskUrl -OutFile $taskArchive -TimeoutSec 300 }
                finally { $ProgressPreference = $taskPreviousProgress }
                $taskChecksumLine = Get-Content (Join-Path $PSScriptRoot 'bun-checksums.txt') | Where-Object { $_ -match ('\s' + [Regex]::Escape("$taskAsset.zip") + '$') } | Select-Object -First 1
                if (-not $taskChecksumLine) { throw 'Missing runtime checksum.' }
                $taskExpected = ($taskChecksumLine -split '\s+')[0]
                $taskActual = (Get-FileHash -Algorithm SHA256 $taskArchive).Hash.ToLowerInvariant()
                if ($taskActual -ne $taskExpected) { throw 'Runtime checksum mismatch; download rejected.' }
                Expand-Archive -LiteralPath $taskArchive -DestinationPath (Join-Path $taskTemp 'extracted')
                New-Item -ItemType Directory -Force -Path (Split-Path -Parent $taskBun) | Out-Null
                Copy-Item (Join-Path $taskTemp "extracted\$taskAsset\bun.exe") $taskBun -Force
            } finally { Remove-Item -LiteralPath $taskTemp -Recurse -Force }
        }
    }
    if (-not (Test-TaskBun $taskBun)) { throw 'Bun could not start on this machine.' }
    $env:PATH = (Split-Path -Parent $taskBun) + ';' + $env:PATH
    Push-Location $taskRoot
    try {
        $taskCode = Invoke-TaskBun 'scripts/setup.js'
        if ($taskCode -ne 0) { exit $taskCode }
        if ($Action -eq 'start') { $taskCode = Invoke-TaskBun 'scripts/dev.js' }
        elseif ($Action -eq 'build') { $taskCode = Invoke-TaskBun 'scripts/build.js' }
        if ($taskCode -ne 0) { exit $taskCode }
    } finally { Pop-Location }
} catch {
    Write-Error $_.Exception.Message
    exit 1
}
