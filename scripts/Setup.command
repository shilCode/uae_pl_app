#!/bin/bash
# ============================================
# 🇵🇱 Polish Consulate Appointment Checker
#    FIRST-TIME SETUP (run this once)
# ============================================

set -e

# Navigate to project root (parent of scripts/)
cd "$(dirname "$0")/.."

echo ""
echo "═══════════════════════════════════════════════"
echo "  🇵🇱 Polish Consulate Appointment Checker"
echo "     First-Time Setup"
echo "═══════════════════════════════════════════════"
echo ""

# Check if running on macOS
if [[ "$(uname)" != "Darwin" ]]; then
  echo "❌ This tool currently only works on macOS."
  exit 1
fi

# ── Step 1: Check for Homebrew ──
echo "📦 Step 1/4: Checking for Homebrew..."
if ! command -v brew &>/dev/null; then
  echo "   Homebrew not found. Installing..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  echo "   ✅ Homebrew installed"
else
  echo "   ✅ Homebrew already installed"
fi

# ── Step 2: Check for Node.js ──
echo "📦 Step 2/4: Checking for Node.js..."
if ! command -v node &>/dev/null; then
  echo "   Node.js not found. Installing..."
  brew install node
  echo "   ✅ Node.js installed"
else
  echo "   ✅ Node.js already installed ($(node -v))"
fi

# ── Step 3: Check for Tesseract ──
echo "📦 Step 3/4: Checking for Tesseract OCR..."
if ! command -v tesseract &>/dev/null; then
  echo "   Tesseract not found. Installing..."
  brew install tesseract
  echo "   ✅ Tesseract installed"
else
  echo "   ✅ Tesseract already installed"
fi

# ── Step 4: Install project dependencies ──
echo "📦 Step 4/4: Installing project dependencies..."
npm install
npx playwright install chromium
echo "   ✅ Dependencies installed"

echo ""
echo "═══════════════════════════════════════════════"
echo "  ✅ SETUP COMPLETE!"
echo ""
echo "  To start checking for appointments:"
echo "    • Double-click 'Start Checker.command' in scripts/"
echo ""
echo "  To configure settings:"
echo "    • Double-click 'Open Settings.command' in scripts/"
echo "═══════════════════════════════════════════════"
echo ""
read -p "Press Enter to close..."
