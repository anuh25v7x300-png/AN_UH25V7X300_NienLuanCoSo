#!/bin/sh
set -eu

task_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
task_action=${1:-start}
case "$task_action" in setup|start|build) ;; *) echo 'Usage: bootstrap.sh [setup|start|build]' >&2; exit 1 ;; esac
task_version=$(tr -d '\r\n ' < "$task_root/.bun-version")

case "$(uname -s)" in
  Darwin) task_os=darwin ;;
  Linux) task_os=linux ;;
  *) echo 'Use start.cmd on Windows.' >&2; exit 1 ;;
esac
case "$(uname -m)" in
  x86_64|amd64) task_arch=x64 ;;
  aarch64|arm64) task_arch=aarch64 ;;
  *) echo 'This processor is not supported by the launcher.' >&2; exit 1 ;;
esac
task_asset="bun-$task_os-$task_arch"
if [ "$task_os" = linux ] && ldd --version 2>&1 | awk '/musl/{found=1} END{exit !found}'; then task_asset="$task_asset-musl"; fi
if [ "$task_arch" = x64 ]; then task_asset="$task_asset-baseline"; fi
task_bun="$task_root/.runtime/$task_asset/bun"

if [ ! -x "$task_bun" ] || [ "$("$task_bun" --version 2>/dev/null || true)" != "$task_version" ]; then
  task_installed=$(command -v bun 2>/dev/null || true)
  if [ -n "$task_installed" ] && [ "$("$task_installed" --version 2>/dev/null | tr -d '\r')" = "$task_version" ] && [ "$("$task_installed" -p process.platform 2>/dev/null | tr -d '\r')" = "$task_os" ]; then
    task_bun=$task_installed
  else
    mkdir -p "$task_root/.runtime"
    task_tmp=$(mktemp -d "$task_root/.runtime/download.XXXXXX")
    trap 'rm -rf "$task_tmp"' EXIT
    task_archive="$task_tmp/$task_asset.zip"
    task_url="https://github.com/oven-sh/bun/releases/download/bun-v$task_version/$task_asset.zip"
    echo "Downloading Bun $task_version ($task_os/$task_arch)..."
    if command -v curl >/dev/null 2>&1; then
      curl -fL --retry 2 --connect-timeout 20 --max-time 300 "$task_url" -o "$task_archive"
    elif command -v wget >/dev/null 2>&1; then
      wget --timeout=300 -O "$task_archive" "$task_url"
    else
      echo 'Install curl or wget, then run the launcher again.' >&2; exit 1
    fi
    task_expected=$(awk -v file="$task_asset.zip" '$2==file {print $1}' "$task_root/scripts/bun-checksums.txt")
    [ -n "$task_expected" ] || { echo 'Missing runtime checksum.' >&2; exit 1; }
    if command -v sha256sum >/dev/null 2>&1; then
      task_actual=$(sha256sum "$task_archive" | awk '{print $1}')
    elif command -v shasum >/dev/null 2>&1; then
      task_actual=$(shasum -a 256 "$task_archive" | awk '{print $1}')
    elif command -v python3 >/dev/null 2>&1; then
      task_actual=$(python3 -c 'import hashlib,sys;print(hashlib.sha256(open(sys.argv[1],"rb").read()).hexdigest())' "$task_archive")
    else
      echo 'A SHA-256 checker or Python 3 is required.' >&2; exit 1
    fi
    [ "$task_actual" = "$task_expected" ] || { echo 'Runtime checksum mismatch; download rejected.' >&2; exit 1; }
    if command -v unzip >/dev/null 2>&1; then
      unzip -oq "$task_archive" -d "$task_tmp/extracted"
    elif command -v python3 >/dev/null 2>&1; then
      python3 -c 'import zipfile,sys;zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])' "$task_archive" "$task_tmp/extracted"
    else
      echo 'Install unzip or Python 3, then run the launcher again.' >&2; exit 1
    fi
    mkdir -p "$(dirname -- "$task_bun")"
    cp "$task_tmp/extracted/$task_asset/bun" "$task_bun"
    chmod +x "$task_bun"
    rm -rf "$task_tmp"
    trap - EXIT
  fi
fi

[ "$("$task_bun" --version | tr -d '\r')" = "$task_version" ] || { echo 'Bun could not start on this machine.' >&2; exit 1; }
PATH="$(dirname -- "$task_bun"):$PATH"
export PATH
cd "$task_root"
"$task_bun" scripts/setup.js
case "$task_action" in
  start) exec "$task_bun" scripts/dev.js ;;
  build) exec "$task_bun" scripts/build.js ;;
esac
