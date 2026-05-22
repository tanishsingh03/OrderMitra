FROM node:18-alpine

WORKDIR /usr/src/app

# Copy shared utilities
COPY shared /usr/src/shared

# Copy gateway service files
COPY api-gateway /usr/src/app

RUN npm install

EXPOSE 6789

CMD ["npm", "start"]
