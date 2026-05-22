FROM node:18-alpine

WORKDIR /usr/src/app

COPY shared /usr/src/shared
COPY payment-service /usr/src/app

RUN npm install
RUN npx prisma generate

EXPOSE 3006

CMD ["npm", "start"]
