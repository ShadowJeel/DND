# SQLite to Supabase Migration Guide

## Overview
Your DND Purchase application has been successfully migrated from SQLite to Supabase. This document explains what changed and how to set it up.

## What Changed

### Dependencies
- **Removed**: `better-sqlite3` (local SQLite driver)
- **Added**: `@supabase/supabase-js` (Supabase client library)

### Files Modified
1. **package.json** - Updated dependencies
2. **lib/db.ts** - Replaced SQLite initialization with Supabase client
3. **lib/store.ts** - All queries converted to async Supabase queries
4. **lib/seed.ts** - Seed script now uses Supabase async operations

### New Files Created
1. **.env.local.example** - Template for environment variables
2. **SUPABASE_SCHEMA.sql** - SQL schema to create tables in Supabase
3. **MIGRATION_GUIDE.md** - This file

## Setup Instructions

### 1. Create a Supabase Project
1. Go to [Supabase](https://supabase.com)
2. Sign up or log in
3. Create a new project
4. Wait for the project to initialize

### 2. Create Database Tables
1. Go to your Supabase project dashboard
2. Click "SQL Editor" in the left sidebar
3. Create a new query
4. Copy and paste the entire contents of **SUPABASE_SCHEMA.sql**
5. Click "Run" to execute the SQL
6. Verify all tables are created (check "Table Editor" in left sidebar)

### 3. Configure Environment Variables
1. In your Supabase project, go to Settings → API
2. Copy your **Project URL**
3. Copy your **Anon Key** (public key)
4. Create a `.env.local` file in your project root:

```bash
cp .env.local.example .env.local
```

5. Edit `.env.local` and add your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Install Dependencies
```bash
pnpm install
```

### 5. Seed Demo Data (Optional)
To populate the database with demo data for testing:

```bash
pnpm db:seed
```

This will insert:
- 2 demo buyers
- 1 demo seller
- 5 sample inquiries
- 10 sample offers

### 6. Test the Application
```bash
pnpm dev
```

Navigate to http://localhost:3000 and test the login and inquiry features.

## Demo Credentials

### Buyers
- **Email**: buyer@tata.com / **Password**: password
- **Email**: buyer@lnt.com / **Password**: password

### Sellers
- **Email**: seller@demo.com / **Password**: password

## Key API Changes

### Before (SQLite)
```typescript
import { db } from "./db"

const user = db.prepare("SELECT * FROM buyers WHERE id = ?").get(id)
```

### After (Supabase)
```typescript
import { supabase } from "./db"

const { data: users } = await supabase
  .from("buyers")
  .select("*")
  .eq("id", id)
  .limit(1)
const user = users?.[0]
```

## Important Notes

### Async Operations
All database operations are now **async** and require `await`. If you're using database functions in components, make sure to use them in `useEffect` hooks or async functions.

### RLS Policies
The schema includes permissive RLS policies for development. For production, you should:
1. Implement proper authentication with Supabase Auth
2. Set up Row Level Security (RLS) policies based on user roles
3. Use service role key for admin operations (server-side only)

### Environment Variables
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are public (used on client)
- Keep `SUPABASE_SERVICE_ROLE_KEY` private (server-side only if needed)

### Using in API Routes
For server-side operations, you can import the anon client:

```typescript
import { supabase } from "@/lib/db"

export async function POST(req: Request) {
  const { data } = await supabase
    .from("inquiries")
    .select("*")
  return Response.json(data)
}
```

For admin operations, create a service client:

```typescript
import { createClient } from "@supabase/supabase-js"

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
```

## Troubleshooting

### Connection Issues
- Verify SUPABASE_URL and SUPABASE_ANON_KEY in `.env.local`
- Check that Supabase project is active
- Ensure your Supabase project allows connections

### Table Not Found Errors
- Run SUPABASE_SCHEMA.sql again in SQL Editor
- Check that tables exist in Table Editor
- Verify correct table names (they're lowercase with underscores)

### Authentication Issues
- Current setup uses simple email/password (no Supabase Auth)
- For production, implement Supabase Auth
- See [Supabase Auth Docs](https://supabase.com/docs/guides/auth)

### Performance Issues
- Ensure indexes are created (check SUPABASE_SCHEMA.sql)
- Consider enabling Query Planning in Supabase for optimization
- Use Supabase Logs to monitor slow queries

## Migration From SQLite Data

If you have existing SQLite data to migrate:

1. Export your SQLite data to CSV/JSON:
```bash
npm install -g sqlite3
sqlite3 data/dnd-purchase.db ".mode csv" ".output buyers.csv" "SELECT * FROM buyers;"
```

2. Import to Supabase:
   - Go to Table Editor
   - Click the table name
   - Click "Import data"
   - Upload your CSV file

## Next Steps

1. **Implement Authentication**: Use Supabase Auth for secure user management
2. **Set Up Row Level Security**: Restrict data access based on user roles
3. **Enable Backups**: Configure automatic backups in Supabase settings
4. **Monitor Usage**: Set up usage alerts in Supabase
5. **Implement File Storage**: Use Supabase Storage for document uploads

## Support Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JS Client Docs](https://supabase.com/docs/reference/javascript/introduction)
- [Supabase Community Discord](https://discord.supabase.com)

## Summary of Updated Functions

All database functions in `lib/store.ts` now return `Promise` and must be awaited:

- `registerUser()` - async
- `loginUser()` - async
- `getUserById()` - async
- `createInquiry()` - async
- `getInquiryById()` - async
- `getInquiriesByBuyerId()` - async
- `getAllInquiries()` - async
- `getOpenInquiries()` - async
- `updateInquiryItem()` - async
- `deleteInquiryItem()` - async
- `activateBidding()` - async
- `closeInquiry()` - async
- `createOffer()` - async
- `getOffersByInquiryId()` - async
- `getOffersBySellerId()` - async
- `getOfferById()` - async
- `acceptOffer()` - async
- `rejectOffer()` - async
- `disqualifyOffer()` - async
- `updateOfferRanks()` - async
- `getAcceptedOffersByUserId()` - async
- `getUserDisplayName()` - async

Update all calls to these functions to use `await`.
