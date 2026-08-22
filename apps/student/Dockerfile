# Use standard official Node Alpine image
FROM node:18-alpine

# Set working directory inside container
WORKDIR /usr/src/app

# Copy dependency definitions
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy source code and UI resources
COPY src/ ./src/
COPY public/ ./public/

# Enforce secure least-privilege non-root execution context
USER node

# Expose server port
EXPOSE 8081

# Define default startup command
CMD ["node", "src/server.js"]
