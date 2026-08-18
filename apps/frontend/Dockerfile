FROM node:20-alpine AS base

WORKDIR /app
COPY package*.json ./
COPY apps/frontend/package*.json ./apps/frontend/
COPY packages/shared-types/package*.json ./packages/shared-types/

RUN npm install

COPY . .

RUN npm run build --workspace=@automation/frontend

EXPOSE 3000
CMD ["npm", "run", "start", "--workspace=@automation/frontend"]
