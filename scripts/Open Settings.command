#!/bin/bash
# ============================================
# ⚙️ Open Settings
# ============================================

# Navigate to project root (parent of scripts/)
cd "$(dirname "$0")/.."

echo ""
echo "═══════════════════════════════════════════════"
echo "  ⚙️  Opening Settings File"
echo "═══════════════════════════════════════════════"
echo ""
echo "The settings file (.env) will open in TextEdit."
echo "Edit the values, save, and close."
echo ""

open -e .env

echo "Settings file opened."
read -p "Press Enter to close..."
