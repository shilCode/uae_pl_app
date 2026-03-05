#!/usr/bin/env bash
set -u

# Usage:
#   ./scripts/find-service-types-over-3.sh [logs_path]
# Examples:
#   ./scripts/find-service-types-over-3.sh
#   ./scripts/find-service-types-over-3.sh logs
#   ./scripts/find-service-types-over-3.sh logs/run-2026-03-01T18-26-38.log

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
RAW_TARGET_PATH="${1:-logs}"

resolve_path() {
  local input_path="$1"

  if [ -e "$input_path" ]; then
    printf "%s" "$input_path"
    return 0
  fi

  if [ -e "$PROJECT_ROOT/$input_path" ]; then
    printf "%s" "$PROJECT_ROOT/$input_path"
    return 0
  fi

  if [ -e "$SCRIPT_DIR/$input_path" ]; then
    printf "%s" "$SCRIPT_DIR/$input_path"
    return 0
  fi

  return 1
}

TARGET_PATH="$(resolve_path "$RAW_TARGET_PATH")" || {
  echo "Error: path not found: $RAW_TARGET_PATH" >&2
  echo "Checked: $RAW_TARGET_PATH, $PROJECT_ROOT/$RAW_TARGET_PATH, $SCRIPT_DIR/$RAW_TARGET_PATH" >&2
  exit 1
}

FILES=()
if [ -d "$TARGET_PATH" ]; then
  while IFS= read -r -d '' file; do
    FILES+=("$file")
  done < <(find "$TARGET_PATH" -type f -name "*.log" -print0 | sort -z)
else
  case "$TARGET_PATH" in
    *.log)
      FILES+=("$TARGET_PATH")
      ;;
    *)
      echo "Error: file is not a .log file: $TARGET_PATH" >&2
      exit 1
      ;;
  esac
fi

if [ ${#FILES[@]} -eq 0 ]; then
  echo "No .log files found in: $TARGET_PATH"
  exit 0
fi

FOUND=0
TOTAL_MATCHING_LINES=0
FOUND_APPOINTMENT=0
TOTAL_APPOINTMENT_LINES=0

echo "Scanning for:"
echo "  1) Available service types with more than 3 options"
echo "  2) APPOINTMENT SLOT FOUND!"

for file in "${FILES[@]}"; do
  while IFS= read -r line; do
    line_number="${line%%:*}"
    content="${line#*:}"

    FOUND_APPOINTMENT=1
    TOTAL_APPOINTMENT_LINES=$((TOTAL_APPOINTMENT_LINES + 1))
    printf "%s:%s | appointment_found | %s\n" "$file" "$line_number" "$content"
  done < <(grep -n "APPOINTMENT SLOT FOUND!" "$file" || true)

  while IFS= read -r line; do
    line_number="${line%%:*}"
    content="${line#*:}"

    # Count quoted service names by counting quote characters.
    quote_count=$(printf "%s" "$content" | tr -cd '"' | wc -c)
    type_count=$((quote_count / 2))

    if [ "$type_count" -gt 3 ]; then
      FOUND=1
      TOTAL_MATCHING_LINES=$((TOTAL_MATCHING_LINES + 1))
      printf "%s:%s | types=%s | %s\n" "$file" "$line_number" "$type_count" "$content"
    fi
  done < <(grep -n "Available service types:" "$file" || true)
done

if [ "$FOUND" -eq 0 ] && [ "$FOUND_APPOINTMENT" -eq 0 ]; then
  echo "No lines found with more than 3 available service types."
  echo "No lines found with APPOINTMENT SLOT FOUND!"
  exit 0
fi

echo "Found $TOTAL_MATCHING_LINES line(s) with more than 3 available service types."
echo "Found $TOTAL_APPOINTMENT_LINES line(s) with APPOINTMENT SLOT FOUND!"
