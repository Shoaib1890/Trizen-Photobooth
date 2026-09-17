# Demo Credentials (Submission Reference)

Do not commit production secrets. Use these credentials only for demo/review environments after seeding.

## Admin

- **Email:** `admin@trizen.demo`
- **Password:** `Admin123!`

## Team Member

- **Email:** `member@trizen.demo`
- **Password:** `Member123!`

## Demo Gallery

After running `npm run db:seed`, the terminal prints the live slug, for example:

- **Gallery URL:** `http://localhost:3000/gallery/RVyhg2AsyVFu`
- **PIN:** `482917`

(Slug changes each time you re-seed.)

Reset demo data anytime with:

```bash
npm run db:seed
```
