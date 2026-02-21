# 🇵🇱 Polish Consulate Appointment Checker (Abu Dhabi)

Automatically checks the Polish consulate website for visa appointment slots and alerts you the moment one becomes available — with sound, desktop notification, and optional Telegram message.

Works on **macOS** and **Windows**.

---

## 📋 What This Does

The Polish consulate appointment slots are almost always fully booked. This tool:

1. **Opens Chrome** and goes to the consulate booking website
2. **Solves the CAPTCHA** automatically (or asks you to solve it if auto-solve fails)
3. **Fills in your visa details** (visa type, location, number of people)
4. **Checks if any slots are available**
5. **If a slot is found** → loud alert sound + desktop notification + voice message + Telegram notification
6. **If no slots** → closes the browser, waits, and tries again automatically

It keeps running until you stop it or an appointment is found.

---

## 🚀 Getting Started — macOS

### Step 1: Download the folder

Get the entire project folder onto your Mac (e.g., from a USB drive, AirDrop, or download it).

### Step 2: Run Setup

1. Open the project folder in Finder, then open the **`scripts`** folder
2. **Double-click `Setup.command`**
3. If macOS blocks it: right-click → "Open" → click "Open" again
4. Wait for it to finish (it installs Node.js, Chrome, and other tools)
5. You only need to do this **once**

### Step 3: Start Checking

1. **Double-click `Start Checker.command`** (in the `scripts` folder)
2. Chrome will open and the tool will start checking
3. Keep the terminal window open — it shows the status
4. **To stop**: press `Ctrl+C` or close the terminal window

---

## 🚀 Getting Started — Windows

### Step 1: Install Node.js (one time)

1. Go to **https://nodejs.org** and download the **LTS** version
2. Run the installer — click **Next** through all steps (keep defaults)
3. **Restart your computer** after installation

### Step 2: Download the folder

Get the entire project folder onto your PC (e.g., from a USB drive, email, or download it).

### Step 3: Run Setup

1. Open the project folder in File Explorer, then open the **`scripts`** folder
2. **Double-click `Setup.bat`**
3. If Windows shows "Windows protected your PC": click **More info** → **Run anyway**
4. Wait for it to finish (it installs Chrome browser for automation and other tools)
5. You only need to do this **once**

### Step 4: Start Checking

1. **Double-click `Start Checker.bat`** (in the `scripts` folder)
2. Chrome will open and the tool will start checking
3. Keep the command prompt window open — it shows the status
4. **To stop**: press `Ctrl+C` → type `Y` → press Enter, or close the window

---

## 📁 Files You Can Double-Click

All scripts are in the **`scripts/`** folder inside the project.

### macOS

| File | What it does |
|---|---|
| **`Setup.command`** | First-time setup — installs everything (run once) |
| **`Start Checker.command`** | Starts continuous checking (run daily) |
| **`Single Check.command`** | Checks once and stops |
| **`Open Settings.command`** | Opens settings file to change options |

### Windows

| File | What it does |
|---|---|
| **`Setup.bat`** | First-time setup — installs everything (run once) |
| **`Start Checker.bat`** | Starts continuous checking (run daily) |
| **`Single Check.bat`** | Checks once and stops |
| **`Open Settings.bat`** | Opens settings file to change options |

---

## 🖥️ Running from the Terminal (for developers)

If you prefer the command line over double-clicking scripts:

```bash
# First-time setup
npm install
npx playwright install chromium

# Start continuous checking
npm run check

# Run a single check
npm run check:once

# Test CAPTCHA solver (saves 5 sample screenshots for review)
npm run captcha:debug

# Open the last test report
npm run report
```

---

## ⚙️ Settings

- **macOS**: Double-click **`scripts/Open Settings.command`**
- **Windows**: Double-click **`scripts/Open Settings.bat`**

Here's what each setting means:

| Setting | What it means | Default |
|---|---|---|
| `POLL_INTERVAL_MS` | How long to wait between checks (in milliseconds). 60000 = 1 minute, 600000 = 10 minutes | `600000` |
| `MAX_RETRIES` | How many times to check before stopping | `5000` |
| `SERVICE_TYPE` | Type of visa: `Wiza krajowa` (national), `Wiza krajowa - praca` (work), or `Wiza krajowa – studenci` (students) | `Wiza krajowa` |
| `NUM_PEOPLE` | Number of people: `1 osob` through `8 osob` | `1 osob` |
| `MAX_CAPTCHA_ATTEMPTS` | How many times to try auto-solving the CAPTCHA before asking you | `20` |

**Save the file after editing.** The new settings apply the next time you start the checker.

---

## 📱 Telegram Notifications (Optional)

Get notified on your phone when a slot is found:

### Setup (2 minutes, one time):

1. Open **Telegram** on your phone
2. Search for **@BotFather** and start a chat
3. Send: `/newbot`
4. Follow the steps — give your bot a name (e.g., "My Appointment Bot")
5. BotFather will give you a **token** like `123456789:ABCdefGHIjklMNOpqrsTUVwxyz` — copy it
6. **Send any message** to your new bot (just say "hi")
7. Open this link in your browser (replace YOUR_TOKEN with the token from step 5):
   ```
   https://api.telegram.org/botYOUR_TOKEN/getUpdates
   ```
8. Look for `"chat":{"id":` followed by a number — that's your **chat ID**
9. Open your settings file (double-click **`Open Settings.command`** on Mac or **`Open Settings.bat`** on Windows, in the `scripts` folder) and fill in:
   ```
   TELEGRAM_BOT_TOKEN=paste-your-token-here
   TELEGRAM_CHAT_ID=paste-your-chat-id-here
   ```
10. Save and close

Now you'll get a Telegram message whenever a slot is found!

---

## 🔊 What Happens When a Slot is Found?

1. 🔔 **Desktop notification** pops up
2. 🗣️ **Voice says** "Appointment available! Go to the browser now!"
3. 🔊 **Alert sounds** play repeatedly
4. 📱 **Telegram message** sent (if configured)
5. 📸 **Screenshot** saved in the `screenshots/` folder
6. 🌐 **Browser stays open** so you can book immediately

---

## 📝 Logs

All activity is logged to the `logs/` folder. Each run creates a new log file like `run-2026-02-20T09-05-34.log`. You can open these with any text editor to review what happened.

---

## ❓ Troubleshooting

**macOS: "Setup.command can't be opened because it's from an unidentified developer"**
→ Right-click the file → "Open" → click "Open" in the dialog

**Windows: "Windows protected your PC"**
→ Click **More info** → click **Run anyway**

**Windows: "'node' is not recognized as an internal or external command"**
→ You need to install Node.js first. Go to https://nodejs.org, install it, then **restart your computer**

**"Dependencies not installed"**
→ Double-click the Setup file first (`Setup.command` on Mac, `Setup.bat` on Windows)

**CAPTCHA auto-solve keeps failing**
→ Open Settings and set `MAX_CAPTCHA_ATTEMPTS=0` to always solve manually

**Checker stops after a while**
→ Increase `MAX_RETRIES` in settings (e.g., `MAX_RETRIES=10000`)

**Want to check more often**
→ Decrease `POLL_INTERVAL_MS` (e.g., `60000` for every minute). Don't go lower than 30000 or the website might block you.
