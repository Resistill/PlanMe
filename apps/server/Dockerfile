FROM node:22-slim AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

FROM base AS build
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile || pnpm install
COPY . .
RUN pnpm build

FROM base AS runtime
COPY --from=build /app/package.json /app/pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile --prod || pnpm install --prod
COPY --from=build /app/dist ./dist

ENV PLANME_PORT=3847
ENV PLANME_DATA_DIR=/app/data
EXPOSE 3847

VOLUME ["/app/data"]
CMD ["node", "dist/index.js"]
