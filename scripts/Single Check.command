#!/bin/bash
# ============================================
# 🇵🇱 Single Check (one-time)
# ============================================

# Navigate to project root (parent of scripts/)
cd "$(dirname "$0")/.."

echo ""
echo "═══════════════════════════════════════════════"
echo "  🇵🇱 Polish Consulate - Single Check"
echo "═══════════════════════════════════════════════"
echo ""

if [ ! -d "node_modules" ]; then
  echo "❌ Dependencies not installed!"
  echo "   Please double-click 'Setup.command' in the scripts/ folder first."
  echo ""
  read -p "Press Enter to close..."
  exit 1
fi

npm run check:once

echo ""
read -p "Press Enter to close..."
