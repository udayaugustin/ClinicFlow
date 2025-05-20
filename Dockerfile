# Build stage
FROM node:18-alpine as builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies including Vite (needed for production)
RUN npm install && npm install vite @vitejs/plugin-react @replit/vite-plugin-shadcn-theme-json @replit/vite-plugin-cartographer @replit/vite-plugin-runtime-error-modal

# Copy built assets from builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/vite.config.* ./

# Set environment variables
ENV NODE_ENV=production \
    PORT=3000

# Expose port
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
