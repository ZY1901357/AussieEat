# Use Node.js image
FROM node:20

# Set working directory inside container
WORKDIR /app

# Copy package.json and package-lock.json first
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the backend code
COPY . .

# Expose the backend port
EXPOSE 5000

# Start the server
CMD ["npm", "start"]
