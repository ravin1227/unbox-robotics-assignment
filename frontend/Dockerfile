FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy environment template → .env (Compose/runtime env vars override when set)
COPY .env.example .env.example
RUN cp .env.example .env

# Copy configuration files
COPY vite.config.js ./
COPY tailwind.config.js ./
COPY postcss.config.js ./
COPY index.html ./
COPY public ./public

# Copy source code
COPY src ./src

# Expose port
EXPOSE 3000

# Health check (check if dev server is responding)
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000 || exit 1

# Default command
CMD ["npm", "run", "dev"]
