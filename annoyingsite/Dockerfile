FROM node:18-alpine
RUN apk add --no-cache git \
    && git clone https://github.com/feross/TheAnnoyingSite.com /app
WORKDIR /app
RUN npm install
EXPOSE 4000
CMD ["npm", "start"]
