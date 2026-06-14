FROM node:22-slim

# Install Playwright system deps
RUN apt-get update && apt-get install -y \
    wget gnupg ca-certificates \
    libglib2.0-0 libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 \
    libcups2 libdrm2 libdbus-1-3 libxkbcommon0 libx11-6 libxcomposite1 \
    libxdamage1 libxext6 libxfixes3 libxrandr2 libgbm1 libpango-1.0-0 \
    libcairo2 libasound2 libatspi2.0-0 \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd -r netleaf && useradd -r -g netleaf netleaf

WORKDIR /app

COPY package.json ./
RUN npm install

# Install Playwright chromium only (must run as root)
RUN npx playwright install chromium

COPY . .
RUN npm run build

# Drop to non-root for runtime
RUN chown -R netleaf:netleaf /app
USER netleaf

EXPOSE 3000
CMD ["node", "dist/index.js"]
