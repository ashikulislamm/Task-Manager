# Use the official lightweight Node.js active LTS alpine image
FROM node:20-alpine

# Set node environment to production
ENV NODE_ENV=production

# Set working directory inside container
WORKDIR /app

# Copy dependency specifications
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy all application files
COPY . .

# Expose server port
EXPOSE 3000

# Execute server starting script
CMD ["npm", "start"]
