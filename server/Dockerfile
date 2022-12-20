FROM node:18.12.1 AS build
WORKDIR /hermes
COPY ./src src
COPY ./package.json package.json
COPY ./tsconfig.json tsconfig.json
RUN yarn install
RUN yarn build

FROM node:18.12.1
WORKDIR /hermes
COPY --from=build /hermes/dist dist
COPY --from=build /hermes/package.json package.json
RUN yarn install --production
EXPOSE 9000
CMD ["node", "dist/server.js"]
