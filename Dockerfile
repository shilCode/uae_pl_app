# ── Stage 1: Install deps & Playwright browsers ──
FROM node:22-bookworm-slim AS base

# System deps required by Playwright Chromium + sharp
RUN apt-get update && apt-get install -y --no-install-recommends \
    # Playwright Chromium dependencies
    libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
    libdbus-1-3 libxkbcommon0 libatspi2.0-0 libxcomposite1 libxdamage1 \
    libxfixes3 libxrandr2 libgbm1 libpango-1.0-0 libcairo2 libasound2 \
    libwayland-client0 \
    # Xvfb for headed mode in container
    xvfb \
    # Fonts (needed for proper page rendering)
    fonts-liberation fonts-noto-color-emoji \
    # Misc
    ca-certificates wget \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and install dependencies
COPY package.json package-lock.json* ./
RUN npm ci --ignore-scripts && \
    # Install Playwright browsers (Chromium only since that's all we use)
    npx playwright install chromium && \
    # Rebuild native modules (sharp)
    npm rebuild sharp

# Copy the rest of the project
COPY . .

# Ensure directories exist
RUN mkdir -p logs screenshots/appointments-found playwright-report test-results

# Signal to playwright.config.ts to use bundled Chromium instead of channel: 'chrome'
ENV CONTAINER=1

# Default: run the continuous checker
CMD ["npm", "run", "check"]
