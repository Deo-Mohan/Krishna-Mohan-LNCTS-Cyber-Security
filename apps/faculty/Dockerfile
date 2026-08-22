FROM node:18-alpine

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm ci --only=production

COPY src/ ./src/
COPY public/ ./public/

USER node

EXPOSE 8082

CMD ["node", "src/server.js"]
