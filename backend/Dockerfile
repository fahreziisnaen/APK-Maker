FROM node:20-alpine
# OpenSSL required by Prisma on Alpine
RUN apk add --no-cache openssl
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY . .
RUN npx prisma generate
RUN mkdir -p data storage/uploads storage/apks
EXPOSE 4001
CMD ["sh", "-c", "npx prisma db push && node src/index.js"]
