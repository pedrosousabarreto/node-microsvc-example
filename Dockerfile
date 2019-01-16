FROM node:10.15.0 as builder

WORKDIR /usr/src/app
COPY package*.json ./

RUN npm install
COPY . .

RUN npm run tsc

FROM node:10.15.0-alpine as app

## Copy built node modules and binaries without including the toolchain
WORKDIR /usr/src/app

COPY --from=builder /usr/src/app/* ./

EXPOSE 3000
CMD [ "npm", "run", "prod" ]