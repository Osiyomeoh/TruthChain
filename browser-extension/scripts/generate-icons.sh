#!/bin/bash

# Generate PNG icons from SVG logo for TruthChain extension
# Requires: ImageMagick or Inkscape

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ICONS_DIR="$SCRIPT_DIR/../icons"
LOGO_SVG="$ICONS_DIR/logo.svg"

if [ ! -f "$LOGO_SVG" ]; then
    echo "Error: logo.svg not found at $LOGO_SVG"
    exit 1
fi

cd "$ICONS_DIR"

# Check for ImageMagick
if command -v convert &> /dev/null; then
    echo "Using ImageMagick to generate icons..."
    convert -background none -resize 16x16 "$LOGO_SVG" icon16.png
    convert -background none -resize 48x48 "$LOGO_SVG" icon48.png
    convert -background none -resize 128x128 "$LOGO_SVG" icon128.png
    echo "✅ Icons generated successfully!"
    
# Check for Inkscape
elif command -v inkscape &> /dev/null; then
    echo "Using Inkscape to generate icons..."
    inkscape "$LOGO_SVG" --export-width=16 --export-filename=icon16.png
    inkscape "$LOGO_SVG" --export-width=48 --export-filename=icon48.png
    inkscape "$LOGO_SVG" --export-width=128 --export-filename=icon128.png
    echo "✅ Icons generated successfully!"
    
else
    echo "Error: Neither ImageMagick nor Inkscape found."
    echo "Please install one of them:"
    echo "  - ImageMagick: brew install imagemagick (macOS) or apt-get install imagemagick (Linux)"
    echo "  - Inkscape: brew install inkscape (macOS) or apt-get install inkscape (Linux)"
    exit 1
fi


