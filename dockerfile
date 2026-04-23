FROM node:lts-alpine

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.33.0 --activate

# Install deps (INCLUDING devDependencies)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN pnpm install --frozen-lockfile

# Copy source and build once during image creation
COPY . .
RUN pnpm run build

ENV NODE_ENV=production

# Expose app port
EXPOSE 3000

# Run the prebuilt app instead of recompiling on container start
CMD ["pnpm", "run", "start:prod"]
