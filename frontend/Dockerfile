FROM node:20-alpine

# Install postgresql-client to allow running psql commands
RUN apk add --no-cache postgresql-client

WORKDIR /app

# Copy package descriptors 
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy application source
COPY . .

# Expose port
EXPOSE 5000

# Construct the connection string manually using your .env variables
# Format: postgresql://USER:PASSWORD@HOST:PORT/NAME
CMD ["sh", "-c", "psql postgresql://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME -f /app/src/db/schema.sql && npm run dev"]