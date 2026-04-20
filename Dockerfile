FROM node:20-alpine

WORKDIR /app

# Copy package descriptors
COPY frontend/package*.json ./frontend/
COPY backend/package*.json ./backend/

# Install dependencies
RUN cd frontend && npm install
RUN cd backend && npm install

# Copy source code
COPY frontend ./frontend
COPY backend ./backend

# Build frontend
RUN cd frontend && npm run build

# Expose the port Cloud Run uses
EXPOSE 3000

# Set environment variable so Express listens correctly
ENV PORT=3000

# Start the backend server
CMD ["node", "backend/server.js"]
