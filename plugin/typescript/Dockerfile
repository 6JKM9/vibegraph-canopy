# Dockerfile for Canopy + TypeScript Plugin
# Build from repository root: docker build -f plugin/typescript/Dockerfile -t canopy-typescript .

# Stage 1: Build the web apps embedded in the Canopy binary.
FROM node:20-alpine AS web-builder
WORKDIR /app/cmd/rpc/web/explorer
COPY cmd/rpc/web/explorer/package.json cmd/rpc/web/explorer/package-lock.json ./
RUN npm ci
COPY cmd/rpc/web/explorer/ ./
RUN npm run build

WORKDIR /app/cmd/rpc/web/wallet
COPY cmd/rpc/web/wallet/package.json cmd/rpc/web/wallet/package-lock.json ./
RUN npm ci
COPY cmd/rpc/web/wallet/ ./
RUN npm run build

# Stage 2: Build Canopy (Go)
FROM golang:1.25-alpine AS canopy-builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
COPY --from=web-builder /app/cmd/rpc/web/explorer/dist cmd/rpc/web/explorer/dist
COPY --from=web-builder /app/cmd/rpc/web/wallet/out cmd/rpc/web/wallet/out
RUN go build -trimpath -ldflags="-s -w" -o /canopy ./cmd/main/...

# Stage 3: Build TypeScript Plugin
FROM node:20-alpine AS typescript-builder
WORKDIR /app
COPY plugin/typescript/ ./
RUN npm ci && npm run build:all

# Stage 4: Runtime
FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache bash && mkdir -p /tmp/plugin /root/.canopy plugin/typescript

COPY --from=canopy-builder /canopy .
COPY --from=typescript-builder /app/dist plugin/typescript/dist/
COPY --from=typescript-builder /app/node_modules plugin/typescript/node_modules/
COPY --from=typescript-builder /app/package.json plugin/typescript/
COPY plugin/typescript/pluginctl.sh plugin/typescript/pluginctl.sh
RUN sed -i 's/\r$//' plugin/typescript/pluginctl.sh && chmod +x plugin/typescript/pluginctl.sh

# Set plugin type for Canopy to start
RUN printf '{"plugin":"typescript"}\n' > /root/.canopy/config.json

# Default: run canopy (start plugin separately with: node plugin/main.js)
# Mount config at runtime: -v ~/.canopy:/root/.canopy
CMD ["./canopy", "start"]
