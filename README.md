# Geora

Geora is an offline-first field work proof app built with React Native Expo, Node.js, Express, PostgreSQL, and Prisma.

The MVP focuses on a field employee being able to log in, receive tasks, capture a proof photo with GPS and timestamp metadata, keep working offline, sync later, and let a manager verify the proof.

## Workspace

```txt
apps/
  mobile/    Expo React Native app
  api/       Express + Prisma API
docs/        Product and engineering docs
```

## Start Here

Read [docs/PROJECT_PLAN.md](docs/PROJECT_PLAN.md) for the complete roadmap, architecture, feature phases, edge cases, and implementation order.

## Local Development

Install dependencies from the repo root:

```bash
npm install
```

Start PostgreSQL:

```bash
docker compose up -d
```

Create `.env`:

```bash
cp apps/api/.env.example apps/api/.env
```

Prepare the database:

```bash
npm run api:prisma:migrate
npm --workspace apps/api run prisma:seed
```

Run the mobile app:

```bash
npm run mobile
```

Run the API:

```bash
npm run api:dev
```

Generate Prisma client:

```bash
npm run api:prisma:generate
```

Apply database migrations during development:

```bash
npm run api:prisma:migrate
```

Seeded demo login:

```txt
employee@geora.test / Password123
manager@geora.test / Password123
```

## Environment

Copy `apps/api/.env.example` to `apps/api/.env` and update values before running the backend.
