# Trizen Gallery — Photo Sharing Platform

Production-ready full-stack photo sharing platform for photography and event teams. Admins create events, assign team members, review uploads, publish PIN-protected client galleries, and share unique URLs with customers.

## Live demo

Deploy this project to Vercel + Neon + Cloudinary to obtain a production URL. After seeding, use the credentials below.

## Demo credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@trizen.demo` | `Admin123!` |
| Team Member | `member@trizen.demo` | `Member123!` |

After running `npm run db:seed`, the seed script prints:

- Demo gallery URL: `/gallery/{slug}`
- Demo gallery PIN: value of `DEMO_GALLERY_PIN` (default `482917`)

## Features

- Admin registration, login, logout
- Event creation and team member assignment by email
- Team member multi-photo upload to Cloudinary
- Admin photo review with select/unselect
- One gallery per event with 6-digit PIN (bcrypt hashed)
- Publish gallery with cryptographically random slug
- Public PIN-protected customer gallery with lightbox
- Server-side RBAC and gallery access sessions
- Vitest coverage for auth, authorization, photos, and galleries

## User roles

- **Admin** — owns events, assigns team members, selects photos, publishes galleries
- **Team Member** — uploads to assigned events, views own uploads only
- **Customer** — no account; opens share URL, enters PIN, views published photos

## Technology stack

- **Frontend/Backend:** Next.js 16 (App Router), React, TypeScript, Tailwind CSS
- **UI:** Custom components inspired by shadcn/ui patterns
- **Database:** PostgreSQL + Prisma ORM
- **Validation:** Zod
- **Auth:** Custom bcrypt credentials + HTTP-only JWT session cookies (jose)
- **Object storage:** Cloudinary
- **Testing:** Vitest
- **Deployment:** Vercel + managed PostgreSQL (Neon recommended) + Cloudinary

## Architecture overview

```mermaid
flowchart TD
    Browser --> NextJS[Next.js App Router]
    NextJS --> PostgreSQL[(PostgreSQL)]
    NextJS --> Cloudinary[Cloudinary]
    Browser --> Cloudinary
    NextJS --> AuthSession[HTTP-only Auth Cookie]
    NextJS --> GallerySession[HTTP-only Gallery Cookie]
```

### Request flow

1. **Auth session** — signed JWT in `trizen_session` cookie (7 days, HttpOnly, Secure in production)
2. **Photo upload** — team member requests signed Cloudinary params → direct upload → metadata POST to API
3. **Gallery session** — customer verifies PIN → signed JWT in `trizen_gallery_access` cookie (2 hours, scoped to one gallery)
4. **Authorization** — every protected API checks authentication, role, and resource ownership/assignment

## Database design

| Model | Purpose |
|-------|---------|
| `User` | Admin and team member accounts (`role` enum) |
| `Event` | Event owned by an admin |
| `EventMember` | Team member assignment (`eventId`, `userId` unique) |
| `Photo` | Metadata only; files live in Cloudinary |
| `Gallery` | One per event; unique `slug`, bcrypt `pinHash`, publish state |
| `GalleryPhoto` | Join table for published gallery photos only |

Images are never stored in PostgreSQL. Passwords and gallery PINs are bcrypt hashed.

## Project structure

```
src/
  app/               # App Router pages + API routes
  components/        # UI and layout components
  lib/               # Auth, authorization, Cloudinary, validation, API helpers
  server/services/   # Business logic
  types/             # Shared DTO types
prisma/              # Schema, migrations, seed
tests/               # Vitest integration tests
```

## Local setup

### Prerequisites

- Node.js 20+
- Docker (recommended) or a PostgreSQL instance
- Cloudinary account

### 1. Install dependencies

```bash
npm install
```

### 2. Start PostgreSQL

**Option A — Prisma Dev (recommended, no Docker required):**

```bash
npx prisma dev -d --name trizen
npx prisma dev ls
```

Copy the `TCP` connection URL from the output into `.env` as `DATABASE_URL` and `DIRECT_URL`.

**Option B — Docker:**

```bash
docker compose up -d
```

Use `postgresql://trizen:trizen@localhost:5432/trizen` in `.env`.

### 3. Configure environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Example local values:

```env
DATABASE_URL=postgresql://trizen:trizen@localhost:5432/trizen
DIRECT_URL=postgresql://trizen:trizen@localhost:5432/trizen
AUTH_SECRET=replace-with-a-long-random-secret-at-least-32-chars
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
NEXT_PUBLIC_APP_URL=http://localhost:3000
DEMO_GALLERY_PIN=482917
```

Never commit `.env`.

### 4. Migrate and seed

```bash
npm run db:push
npm run db:seed
```

### 5. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `DIRECT_URL` | Optional | Direct connection for migrations (Neon) |
| `AUTH_SECRET` | Yes | Secret for signing auth/gallery JWT cookies (32+ chars) |
| `CLOUDINARY_CLOUD_NAME` | Yes | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Yes | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Yes | Cloudinary API secret |
| `NEXT_PUBLIC_APP_URL` | Yes | Public app URL for share links |
| `DEMO_GALLERY_PIN` | Optional | PIN used by seed script |

## Testing

Tests use the same PostgreSQL database configured in `DATABASE_URL`. Use a separate test database in CI if preferred.

```bash
npm test
```

Coverage includes:

- Admin registration/login/logout
- Role-based authorization boundaries
- Photo upload metadata and access filtering
- Gallery publish rules
- PIN verification and cross-gallery session isolation

## Deployment (Vercel + Neon + Cloudinary)

1. Push the repository to GitHub.
2. Create a Neon PostgreSQL database and copy `DATABASE_URL` / `DIRECT_URL`.
3. Create a Cloudinary account and copy credentials.
4. Import the project in Vercel.
5. Set all environment variables from `.env.example`.
6. Deploy and run migrations:

   ```bash
   npx prisma migrate deploy
   npm run db:seed
   ```

7. Verify HTTPS cookies, uploads, gallery PIN flow, and role restrictions in production.

## API overview

| Method | Route | Access |
|--------|-------|--------|
| POST | `/api/auth/register` | Public (admin only) |
| POST | `/api/auth/login` | Public |
| POST | `/api/auth/logout` | Authenticated |
| GET | `/api/auth/me` | Authenticated |
| GET/POST | `/api/events` | Authenticated |
| GET | `/api/events/:eventId` | Admin owner or assigned member |
| POST/DELETE | `/api/events/:eventId/members` | Admin owner |
| GET/POST | `/api/events/:eventId/photos` | Assigned member upload / role-filtered list |
| PATCH | `/api/photos/:photoId/selection` | Admin owner |
| GET/POST/PATCH | `/api/events/:eventId/gallery` | Admin owner |
| POST | `/api/events/:eventId/gallery/publish` | Admin owner |
| GET | `/api/gallery/:slug` | Public (published only) |
| POST | `/api/gallery/:slug/verify` | Public |
| GET | `/api/gallery/:slug/photos` | Gallery session required |

## Security considerations

- Server-side RBAC on every protected route
- IDOR checks for events, photos, and galleries
- Gallery PINs and passwords hashed with bcrypt
- Separate gallery access cookie scoped to one gallery
- Unpublished galleries return generic 404
- Wrong PIN returns 401 with no photo URLs
- Basic PIN rate limiting per IP + slug
- Production cookies: HttpOnly, Secure, SameSite=Lax

## Known limitations

- Team member accounts are seeded or provisioned manually (no public team registration or email invitations)
- PIN rate limiting is in-memory (resets on server restart; use Redis in larger deployments)
- No photo deletion UI (optional per PRD)
- Demo seed uses Cloudinary demo URLs for sample photos unless real uploads are added
- Pagination is not implemented for very large galleries

## Future improvements

- Email invitations for team members
- Redis-backed rate limiting and session store
- Photo deletion with Cloudinary cleanup
- Pagination/infinite scroll for large galleries
- CI pipeline with GitHub Actions
- Admin-created team member accounts from dashboard

## Security note for submission

Do not commit secrets. Provide demo credentials and gallery PIN separately to reviewers as required by the internship brief.
