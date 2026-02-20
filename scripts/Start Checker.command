#!/bin/bash
# ============================================
# 🇵🇱 Start Appointment Checker
#    (continuous monitoring)
# ============================================

# Navigate to project root (parent of scripts/)
cd "$(dirname "$0")/.."

echo ""
echo "═══════════════════════════════════════════════"
echo "  🇵🇱 Polish Consulate Appointment Checker"
echo "     Starting continuous monitoring..."
echo "═══════════════════════════════════════════════"
echo ""

# Check if setup was run
if [ ! -d "node_modules" ]; then
  echo "❌ Dependencies not installed!"
  echo "   Please double-click 'Setup.command' in the scripts/ folder first."
  echo ""
  read -p "Press Enter to close..."
  exit 1
fi

# Load and show current settings
echo "Current settings:"
echo "─────────────────"
if [ -f ".env" ]; then
  grep -E "^(SERVICE_TYPE|LOCATION|NUM_PEOPLE|POLL_INTERVAL_MS|MAX_CAPTCHA_ATTEMPTS)" .env | while read line; do
    echo "  $line"
  done
fi
echo ""
echo "💡 The checker will:"
echo "   1. Open Chrome and go to the consulate website"
echo "   2. Try to solve the CAPTCHA automatically"
echo "   3. Fill in your visa details"
echo "   4. Check for available appointments"
echo "   5. If found → alert you with sound + notification"
echo "   6. If not found → close browser, wait, and repeat"
echo ""
echo "⚠️  To stop: press Ctrl+C or close this window"
echo ""
echo "Starting in 3 seconds..."
sleep 3

npm run check

echo ""
echo "Checker stopped."
