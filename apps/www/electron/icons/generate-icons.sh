#!/usr/bin/env bash

set -euo pipefail

# Generate Electron app icons for macOS, Windows, and Linux
# from a single source image while keeping visual padding consistent.
#
# Usage:
#   ./generate-icons.sh <source-image> [padding-percent]
#
# Example:
#   ./generate-icons.sh ./icon.png 12

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_IMAGE="${1:-}"
PADDING_PERCENT="${2:-0}"

if [[ -z "${SOURCE_IMAGE}" ]]; then
  echo "Usage: $0 <source-image> [padding-percent]"
  exit 1
fi

if ! command -v magick >/dev/null 2>&1; then
  echo "ImageMagick (magick) is required."
  exit 1
fi

if ! command -v iconutil >/dev/null 2>&1; then
  echo "iconutil is required on macOS to generate .icns files."
  exit 1
fi

SOURCE_PATH="${SOURCE_IMAGE}"
if [[ ! -f "${SOURCE_PATH}" ]]; then
  SOURCE_PATH="${SCRIPT_DIR}/${SOURCE_IMAGE}"
fi

if [[ ! -f "${SOURCE_PATH}" ]]; then
  echo "Source image not found: ${SOURCE_IMAGE}"
  exit 1
fi

TMP_DIR="$(mktemp -d)"
ICONSET_DIR="${TMP_DIR}/icon.iconset"
LINUX_DIR="${SCRIPT_DIR}/linux"

mkdir -p "${ICONSET_DIR}" "${LINUX_DIR}"

render_padded() {
  local size="$1"
  local out="$2"
  local border=$(( size * PADDING_PERCENT / 100 ))
  local inner=$(( size - 2 * border ))

  if (( inner <= 0 )); then
    echo "Padding percent (${PADDING_PERCENT}) is too large for size ${size}."
    exit 1
  fi

  magick "${SOURCE_PATH}" \
    -background none \
    -resize "${inner}x${inner}" \
    -gravity center \
    -extent "${size}x${size}" \
    "${out}"
}

echo "Generating icons from ${SOURCE_PATH} with ${PADDING_PERCENT}% padding..."

# macOS iconset
render_padded 16 "${ICONSET_DIR}/icon_16x16.png"
render_padded 32 "${ICONSET_DIR}/icon_16x16@2x.png"
render_padded 32 "${ICONSET_DIR}/icon_32x32.png"
render_padded 64 "${ICONSET_DIR}/icon_32x32@2x.png"
render_padded 128 "${ICONSET_DIR}/icon_128x128.png"
render_padded 256 "${ICONSET_DIR}/icon_128x128@2x.png"
render_padded 256 "${ICONSET_DIR}/icon_256x256.png"
render_padded 512 "${ICONSET_DIR}/icon_256x256@2x.png"
render_padded 512 "${ICONSET_DIR}/icon_512x512.png"
render_padded 1024 "${ICONSET_DIR}/icon_512x512@2x.png"

iconutil --convert icns --output "${SCRIPT_DIR}/icon.icns" "${ICONSET_DIR}"

# Windows .ico
render_padded 16 "${TMP_DIR}/win-16.png"
render_padded 20 "${TMP_DIR}/win-20.png"
render_padded 24 "${TMP_DIR}/win-24.png"
render_padded 32 "${TMP_DIR}/win-32.png"
render_padded 40 "${TMP_DIR}/win-40.png"
render_padded 48 "${TMP_DIR}/win-48.png"
render_padded 60 "${TMP_DIR}/win-60.png"
render_padded 64 "${TMP_DIR}/win-64.png"
render_padded 72 "${TMP_DIR}/win-72.png"
render_padded 80 "${TMP_DIR}/win-80.png"
render_padded 96 "${TMP_DIR}/win-96.png"
render_padded 256 "${TMP_DIR}/win-256.png"

magick \
  "${TMP_DIR}/win-256.png" \
  "${TMP_DIR}/win-96.png" \
  "${TMP_DIR}/win-80.png" \
  "${TMP_DIR}/win-72.png" \
  "${TMP_DIR}/win-64.png" \
  "${TMP_DIR}/win-60.png" \
  "${TMP_DIR}/win-48.png" \
  "${TMP_DIR}/win-40.png" \
  "${TMP_DIR}/win-32.png" \
  "${TMP_DIR}/win-24.png" \
  "${TMP_DIR}/win-20.png" \
  "${TMP_DIR}/win-16.png" \
  "${SCRIPT_DIR}/icon.ico"

# Linux + root icon.png
for size in 16 22 24 32 36 48 64 72 96 128 192 256 512; do
  render_padded "${size}" "${LINUX_DIR}/${size}x${size}.png"
done
cp "${LINUX_DIR}/512x512.png" "${SCRIPT_DIR}/icon.png"

rm -rf "${TMP_DIR}"

echo "Done:"
echo "  ${SCRIPT_DIR}/icon.icns"
echo "  ${SCRIPT_DIR}/icon.ico"
echo "  ${SCRIPT_DIR}/icon.png"
echo "  ${LINUX_DIR}/*.png"
