# خدمة الواجهة — Next.js تخدم الواجهة وتمرّر /api. سياق البناء = جذر المستودع.
FROM node:20-alpine
WORKDIR /app

COPY package.json package-lock.json ./
COPY services/web/package.json ./services/web/package.json
RUN npm install

COPY services/web ./services/web

# عنوان خدمة الـ API يُستخدَم في إعادة كتابة /api وجلب بيان الهوية
ENV API_URL=http://api:3001
ENV NODE_ENV=production
RUN npm run build -w @pms/web

EXPOSE 3000
CMD ["npm", "run", "start", "-w", "@pms/web"]
