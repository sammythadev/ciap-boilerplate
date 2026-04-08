FROM node:lts-alpine

WORKDIR /app

# Enable pnpm via Corepack (pinned version for reproducible builds).
RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

# Copy dependency manifests first for Docker layer caching.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./

RUN set -x && pnpm install --frozen-lockfile

# Keep local env path available for bind mount usage.
RUN touch .env

# Copy source code after dependencies are installed.
COPY . .

# Generate Drizzle artifacts required by runtime startup flow.
RUN pnpm run db:generate

EXPOSE 3000

CMD ["pnpm", "start:dev"]
