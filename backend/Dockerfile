FROM golang:1.22-alpine AS builder

WORKDIR /app

# Copy vendor directory and source — no internet needed
COPY go.mod go.sum ./
COPY vendor/ ./vendor/
COPY mimetype-stub/ ./mimetype-stub/
COPY . .

RUN CGO_ENABLED=0 GOOS=linux \
    go build -mod=vendor -ldflags="-w -s" -o crm-server ./cmd/server

FROM alpine:3.19
# Copy SSL certs from builder (golang:alpine already has ca-certificates installed)
# This avoids `apk add` which requires network access to Alpine mirrors
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/ca-certificates.crt

WORKDIR /app
COPY --from=builder /app/crm-server .
COPY configs/ ./configs/

EXPOSE 8080
CMD ["./crm-server"]
