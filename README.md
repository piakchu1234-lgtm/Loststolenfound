This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## 🎉 Recent Updates

**Latest Audit & Fixes (2026-07-03)**:
- ✅ Fixed all critical security issues
- ✅ Build now succeeds without optional dependencies
- ✅ Added comprehensive error handling
- ✅ Optimized images with Next.js Image
- ✅ Configured security headers

See [AUDIT_FINAL_SUMMARY.md](AUDIT_FINAL_SUMMARY.md) for complete details.

## Database Setup

This project uses Supabase for database and authentication. Follow these steps to set up the database:

### Prerequisites

- Node.js 18+ installed
- Docker installed (for local Supabase)
- Supabase account (for remote database)

### Environment Variables

Copy `.env.example` to `.env.local` and fill in your credentials:

```bash
cp .env.example .env.local
```

**Required environment variables**:

- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key (safe for browser)
- `SUPABASE_SERVICE_ROLE_KEY` - Service role key (server-side only, never expose)
- `NEXT_PUBLIC_MAPBOX_TOKEN` - Mapbox access token for maps

**Optional environment variables**:

- `RESEND_API_KEY` - For email notifications (app works without this)
- `RESEND_FROM` - Email sender address
- `CRON_SECRET` - Secret for protecting cron endpoints
- `NEXT_PUBLIC_SITE_URL` - Your production URL
- `NEXT_PUBLIC_ADMIN_EMAIL` - Admin user email
- `NEXT_PUBLIC_GOOGLE_ADSENSE_ID` - Google AdSense publisher ID

For complete environment variable documentation, see [.env.example](.env.example).

### Local Development Setup

1. Install Supabase CLI:
```bash
npm install -g supabase
```

2. Start local Supabase (requires Docker):
```bash
supabase start
```

3. Apply database migrations:
```bash
supabase db reset
```

4. (Optional) Seed test data:
```bash
npm run seed-test-data
```

### Remote Database Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Link your local project:
```bash
supabase link --project-ref your-project-ref
```

3. Push migrations to remote:
```bash
supabase db push
```

### Database Schema

The database includes:
- **users** - User profiles (extends Supabase auth.users)
- **categories** - Item categories (electronics, documents, accessories, pets, other)
- **lost_items** - Items reported as lost
- **found_items** - Items reported as found

All tables have Row Level Security (RLS) enabled for data protection.

### Connection Pooling

The application uses Supabase's built-in PgBouncer connection pooler:
- **Port 6543** (pooler) - Use for application queries (recommended for serverless)
- **Port 5432** (direct) - Use for migrations and admin tasks

### Database Migrations

#### Creating a New Migration

```bash
supabase migration new migration_name
```

This creates a new migration file in `supabase/migrations/` with a timestamp prefix.

#### Applying Migrations Locally

```bash
# Reset database and apply all migrations
supabase db reset

# Or apply new migrations only
supabase migration up
```

#### Rolling Back Migrations

```bash
# Rollback the last migration
supabase migration down

# Rollback to a specific migration
supabase migration down --version <timestamp>
```

#### Pushing Migrations to Remote

```bash
# Push all pending migrations to remote database
supabase db push

# Review changes before pushing
supabase db diff
```

#### Migration Best Practices

- Always test migrations locally before pushing to production
- Use `IF NOT EXISTS` for idempotent operations
- Include both up and down migration scripts
- Never delete migration files after they've been applied to production
- Pull latest migrations before creating new ones to avoid conflicts

### Monitoring

Health check endpoint: `GET /api/health/database`

Returns database connectivity status and response time.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## 📚 Documentation

- [AUDIT_FINAL_SUMMARY.md](AUDIT_FINAL_SUMMARY.md) - Complete audit and fixes summary
- [FIXES_COMPLETED.md](FIXES_COMPLETED.md) - Detailed list of all fixes
- [PHASE2_REACT_OPTIMIZATION.md](PHASE2_REACT_OPTIMIZATION.md) - React optimization details
- [.env.example](.env.example) - Environment variables reference

## 🔒 Security

This application includes:
- ✅ Row Level Security (RLS) enabled on all tables
- ✅ Security headers (X-Frame-Options, CSP, etc.)
- ✅ Environment variable protection
- ✅ Error boundary for graceful error handling
- ✅ Image optimization with Next.js Image

## 🚀 Production Ready

The application is production-ready with:
- ✅ Build succeeds without errors
- ✅ TypeScript checks pass
- ✅ All critical security issues fixed
- ✅ Comprehensive error handling
- ✅ Performance optimizations enabled

## 📝 License

This project is for community use in Malvern East.