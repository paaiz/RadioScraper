FROM node:20-slim

WORKDIR /app

# Install system ffmpeg
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

# Install dependencies terlebih dahulu (layer caching)
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source code
COPY src/ ./src/

CMD ["node", "src/index.js"]
