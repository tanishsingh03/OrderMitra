FROM node:18-alpine

WORKDIR /usr/src/app

COPY shared /usr/src/shared
COPY ai-recommendation-service /usr/src/app

RUN npm install
RUN npx prisma generate

EXPOSE 3009

CMD ["npm", "start"]
