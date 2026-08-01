# RaSpect Inspectica API — container image
# Uses Node 24 (ships the built-in node:sqlite module — no native builds).
FROM node:24-slim

WORKDIR /app

# Install dependencies first (better layer caching)
COPY server/package*.json ./
RUN npm install --omit=dev --no-audit --no-fund

# Copy the backend source
COPY server/ ./

# Runtime
ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["node", "index.js"]
