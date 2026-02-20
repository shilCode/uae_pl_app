# 🇵🇱 Polish Consulate Appointment Checker (Abu Dhabi)

Automated appointment slot checker for the Polish consulate e-Konsulat system.
Monitors for available national visa appointment slots and alerts you immediately.

## How it works

1. Opens the e-Konsulat website in a real Chrome browser
2. Pauses for you to solve the CAPTCHA manually
3. After CAPTCHA, checks if appointment slots are available
4. **If slots found** → Desktop notification + voice alert + sound + browser pauses so you can book
5. **If no slots** → Waits 60 seconds, then repeats from step 1

## Quick Start

```bash
# Install dependencies
npm install

# Run the continuous checker (polls every 60s)
npm run check

# Run a single check
npm run check:once
```

## Configuration

Edit the `.env` file to customize:

| Variable | Default | Description |
|---|---|---|
| `CONSULATE_URL` | Abu Dhabi national visa page | The e-Konsulat URL to check |
| `POLL_INTERVAL_MS` | `60000` (1 min) | How often to recheck |
| `MAX_RETRIES` | `500` | Max polling cycles before stopping |
| `HEADED` | `true` | Show the browser window |

## Commands

| Command | Description |
|---|---|
| `npm run check` | **Continuous polling** — keeps checking until a slot is found |
| `npm run check:once` | **One-shot** — single check then stops |
| `npm run report` | View the HTML test report |

## What happens when an appointment is found?

1. **Desktop notification** appears (macOS)
2. **Voice alert** plays ("Appointment available!")
3. **Alert sounds** play repeatedly
4. **Screenshot** saved to `screenshots/`
5. **Browser pauses** — you manually book the appointment
6. After booking (or skipping), click "Resume" in Playwright Inspector to continue polling

## Tips

- Keep the terminal and browser visible so you can react quickly
- The CAPTCHA must be solved manually each polling cycle
- The script uses real Chrome (`channel: 'chrome'`) to reduce automation detection
- Actions are slightly slowed down (`slowMo: 100`) for the same reason
