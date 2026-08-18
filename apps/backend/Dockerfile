FROM node:20-alpine AS base

WORKDIR /app
COPY package*.json ./
COPY apps/backend/package*.json ./apps/backend/
COPY packages/database/package*.json ./packages/database/
COPY packages/shared-types/package*.json ./packages/shared-types/
COPY packages/connector-sdk/package*.json ./packages/connector-sdk/

RUN npm install

COPY . .

RUN npm run build --workspace=@automation/backend

EXPOSE 5000
CMD ["npm", "run", "start", "--workspace=@automation/backend"]
