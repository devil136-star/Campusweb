FROM node:22-slim

RUN apt-get update && apt-get install -y python3 make g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY prisma.config.ts ./
COPY prisma ./prisma
COPY src ./src
COPY tsconfig.json ./

RUN npx prisma generate && npx prisma migrate deploy

EXPOSE 4000
CMD ["npm", "run", "start"]
