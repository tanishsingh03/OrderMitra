FROM node:18-alpine

WORKDIR /usr/src/app

COPY shared /usr/src/shared
COPY restaurant-service /usr/src/app

RUN npm install
RUN npx prisma generate

EXPOSE 3003

CMD ["npm", "start"]
