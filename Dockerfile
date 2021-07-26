FROM node:alpine:16

WORKDIR /app

COPY package*.json ./

COPY .npmrc ./

RUN npm install

COPY . .

EXPOSE 3004

CMD [ "npm", "start" ]