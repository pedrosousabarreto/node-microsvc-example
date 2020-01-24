FROM node:10.15.0 as base

WORKDIR /app

#--------------------
FROM base AS prod_dependencies
WORKDIR /app

COPY package*.json ./
RUN npm install --production


#--------------------
FROM base AS dev_dependencies
WORKDIR /app

COPY package*.json ./
RUN npm install

#--------------------
FROM dev_dependencies AS build
WORKDIR /app
COPY src src

RUN npm run tsc

#--------------------
FROM node:10.15.0-alpine as release
#RUN apk add --no-cache git

WORKDIR /app

COPY --from=dev_dependencies /app/package*.json ./
COPY --from=prod_dependencies /app/node_modules ./node_modules
COPY --from=build /app/src ./src

EXPOSE 3000
CMD [ "npm", "run", "prod" ]
