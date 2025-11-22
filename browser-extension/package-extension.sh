#!/bin/bash
# Package browser extension for distribution
# Excludes node_modules and creates a zip file

set -e

EXTENSION_DIR="$(cd "$(dirname "$0")" && pwd)"
OUTPUT_DIR="$EXTENSION_DIR/../dist"
ZIP_NAME="truthchain-extension.zip"

echo "📦 Packaging TruthChain Browser Extension..."

# Create dist directory if it doesn't exist
mkdir -p "$OUTPUT_DIR"

# Create a temporary directory for packaging
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

# Copy extension files (excluding node_modules and dist)
echo "📋 Copying extension files..."
rsync -av --exclude='node_modules' \
          --exclude='dist' \
          --exclude='.git' \
          --exclude='*.zip' \
          --exclude='.DS_Store' \
          "$EXTENSION_DIR/" "$TEMP_DIR/"

# Create zip file
echo "🗜️  Creating zip file..."
cd "$TEMP_DIR"
zip -r "$OUTPUT_DIR/$ZIP_NAME" . -q

echo "✅ Extension packaged successfully!"
echo "📦 Output: $OUTPUT_DIR/$ZIP_NAME"
echo ""
echo "To install:"
echo "1. Extract the zip file"
echo "2. Open Chrome and go to chrome://extensions/"
echo "3. Enable 'Developer mode'"
echo "4. Click 'Load unpacked'"
echo "5. Select the extracted folder"

