FROM node:18-alpine

WORKDIR /usr/src/app

COPY shared /usr/src/shared
COPY auth-service /usr/src/app

RUN npm install
RUN npx prisma generate

EXPOSE 3001

CMD ["npm", "start"]
