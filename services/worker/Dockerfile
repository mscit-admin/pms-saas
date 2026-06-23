# خدمة العامل — مزامنة جيرا الدورية. سياق البناء = جذر المستودع.
FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/core/package.json ./packages/core/package.json
COPY services/worker/package.json ./services/worker/package.json
RUN npm install --omit=dev

COPY packages/core ./packages/core
COPY services/worker ./services/worker

WORKDIR /app/services/worker
ENV NODE_ENV=production
CMD ["npm", "start"]
