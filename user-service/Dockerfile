FROM node:18-alpine

WORKDIR /usr/src/app

COPY shared /usr/src/shared
COPY user-service /usr/src/app

RUN npm install
RUN npx prisma generate

EXPOSE 3002

CMD ["npm", "start"]
