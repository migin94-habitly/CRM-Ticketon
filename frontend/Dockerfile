FROM node:20-alpine AS builder

WORKDIR /app
# Copy pre-installed node_modules (no npm ci — no internet access in build env)
COPY package*.json ./
COPY node_modules ./node_modules
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
