FROM golang:1.22-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
COPY vendor/ ./vendor/
COPY mimetype-stub/ ./mimetype-stub/
COPY . .

RUN CGO_ENABLED=0 GOOS=linux \
    go build -mod=vendor -ldflags="-w -s" -o crm-server ./cmd/server

FROM alpine:3.19
RUN apk --no-cache add ca-certificates tzdata

WORKDIR /app
COPY --from=builder /app/crm-server .
COPY configs/ ./configs/

EXPOSE 8080
CMD ["./crm-server"]
