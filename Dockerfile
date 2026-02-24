FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDeps like prisma CLI)
RUN npm install

# Copy application files
COPY . .

# Generate Prisma Client
RUN npx prisma generate

# Remove devDependencies after prisma generate to keep image lean
RUN npm prune --production

# Expose port
EXPOSE 6789

# Start application
CMD ["node", "server.js"]
