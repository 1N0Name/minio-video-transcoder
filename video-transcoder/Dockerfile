FROM node:20.18.3 as builder

RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM node:20.18.3

RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg

WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main.js"]