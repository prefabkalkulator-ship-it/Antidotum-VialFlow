# Use official Node.js runtime as a parent image (Lightweight Alpine)
FROM node:18-alpine

# Set the working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies (only production for smaller image size, but we need typescript to build)
RUN npm install

# Copy the rest of the application code
COPY . .

# Expose port (Cloud Run uses PORT environment variable, defaults to 8080 if not set)
EXPOSE 8080

# Define environment variable for Cloud Run
ENV PORT 8080
ENV NODE_ENV production

# Start the application using tsx
CMD [ "npm", "start" ]
