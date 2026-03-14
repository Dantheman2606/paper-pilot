FROM node:18-alpine

WORKDIR /app

# Copy package descriptors
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application source
COPY . .

# Expose port
EXPOSE 3000

# Start Next.js in dev mode to allow runtime env vars
CMD ["npm", "run", "dev"]
