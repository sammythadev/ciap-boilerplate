FROM node:lts-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

# Install deps (INCLUDING devDependencies)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

# Copy source
COPY . .

# Expose app port
EXPOSE 3000

# Run in dev mode (hot reload)
CMD ["pnpm", "run", "start:dev"]