# ── Stage 1: Build ────────────────────────────────────────
FROM node:20-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json tsconfig.json ./
RUN npm install

COPY prisma ./prisma
RUN npx prisma generate

COPY src ./src
RUN npm run build

# ── Stage 2: Run ──────────────────────────────────────────
FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY prisma ./prisma
RUN npx prisma generate

COPY --from=builder /app/dist ./dist

EXPOSE 3001

CMD ["sh", "-c", "npx prisma db push && node dist/app.js"]
