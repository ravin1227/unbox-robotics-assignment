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

# Default command
CMD ["npm", "run", "dev"]
