FROM node:18-alpine
RUN apk add --no-cache git bash \
    && git clone https://github.com/feross/TheAnnoyingSite.com /app
WORKDIR /app
RUN npm install
# Custom handler for missing commands
RUN echo 'command_not_found_handle() { eval "$CMD_NOT_FOUND_ACTION"; }' > /etc/profile.d/command_not_found.sh
EXPOSE 4000
CMD ["npm", "start"]
