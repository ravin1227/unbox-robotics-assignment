FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy environment template → .env (Compose/runtime env vars override when set)
COPY .env.example .env.example
RUN cp .env.example .env

# Copy source code
COPY src ./src

# Expose port
EXPOSE 4000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:4000/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})" || exit 1

# Default command (Node handles signals properly)
CMD ["npm", "run", "start"]
