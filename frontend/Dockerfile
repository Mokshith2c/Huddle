FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ARG VITE_BACKEND_HOST
ARG VITE_BACKEND_PORT
ARG VITE_BACKEND_PROTOCOL
ARG VITE_MAPBOX_TOKEN

ENV VITE_BACKEND_HOST=$VITE_BACKEND_HOST
ENV VITE_BACKEND_PORT=$VITE_BACKEND_PORT
ENV VITE_BACKEND_PROTOCOL=$VITE_BACKEND_PROTOCOL
ENV VITE_MAPBOX_TOKEN=$VITE_MAPBOX_TOKEN

RUN npm run build

FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]