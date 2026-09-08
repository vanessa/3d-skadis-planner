# Build the static site.
#
# Nixpacks on this Coolify instance can only pin Node 22.11.0 or fall back to
# 18, and both are too old for this app's toolchain: rolldown (Vite 8's
# bundler) requires >=22.12.0 for its prebuilt native binding, and Node 18's
# `node:util` doesn't export `styleText`, which rolldown also needs. A plain
# Dockerfile lets us pick a Node image ourselves instead of fighting
# Nixpacks' version pinning.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Serve the built assets.
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
RUN sed -i 's/listen\s*80;/listen 3000;/' /etc/nginx/conf.d/default.conf
EXPOSE 3000
