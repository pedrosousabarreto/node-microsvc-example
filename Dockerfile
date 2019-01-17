FROM node:10.15.0 as base

WORKDIR /app

#--------------------

FROM base AS dependencies

COPY package*.json ./
RUN npm install

#--------------------
FROM dependencies AS build
WORKDIR /app

COPY src /app/src

RUN npm run tsc

#--------------------

FROM node:10.15.0-alpine as release
RUN apk add --no-cache git

WORKDIR /app

COPY --from=dependencies /app/package*.json ./

RUN npm install --only=production

COPY --from=build /app/src ./src

EXPOSE 3000
CMD [ "npm", "run", "prod" ]
