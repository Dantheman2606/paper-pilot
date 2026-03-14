FROM node:18-alpine

WORKDIR /app

# Copy package descriptors 
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application source
COPY . .

# Expose port
EXPOSE 5000

# Start server in dev mode for simplicity 
CMD ["npm", "run", "dev"]
