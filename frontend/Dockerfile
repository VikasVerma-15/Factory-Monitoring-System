FROM node:18-alpine as build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application code
COPY . .

# Build the application
RUN npm run build

# Production stage - use serve instead of nginx
FROM node:18-alpine

# Install serve globally
RUN npm install -g serve

WORKDIR /app

# Copy built files from build stage
COPY --from=build /app/build ./build

EXPOSE 80

# Serve the static files on port 80
CMD ["serve", "-s", "build", "-l", "80"]



