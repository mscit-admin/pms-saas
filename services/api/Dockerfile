# خدمة الـ API — Express تخدم كل مسارات /api. سياق البناء = جذر المستودع.
FROM node:20-alpine
WORKDIR /app

# تثبيت اعتمادات مساحة العمل (الجذر + core + api فقط)
COPY package.json package-lock.json ./
COPY packages/core/package.json ./packages/core/package.json
COPY services/api/package.json ./services/api/package.json
RUN npm install --omit=dev

# الشيفرة المشتركة + شيفرة الخدمة
COPY packages/core ./packages/core
COPY services/api ./services/api

WORKDIR /app/services/api
RUN mkdir -p uploads
EXPOSE 3001
ENV NODE_ENV=production
CMD ["npm", "start"]
