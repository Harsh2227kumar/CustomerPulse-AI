# Authentication Fix - Database Setup Required

## Problem Identified
The auth trigger that creates user profiles and roles on signup is not working correctly. This causes:
- **429 Too Many Requests** - Repeated failed attempts to find missing profiles
- **RLS policy errors** - Client-side workarounds blocked by security policies
- **Infinite retry loops** - User never logs in successfully

## What I Fixed in Code
1. Removed client-side profile creation (was violating RLS policies)
2. Added debouncing to reduce repeat attempts from 10+/sec to once per auth change
3. Made app gracefully handle missing profiles with sensible defaults
4. Added 500ms delay to let database triggers complete

## What You Need to Do - Execute Database Migration

The real fix is in your Supabase database. You need to execute this migration:

**File:** `supabase/migrations/20260516_fix_auth_trigger.sql`

### Steps to Apply:

#### Option 1: Using Supabase Dashboard (Easiest)
1. Go to https://app.supabase.com
2. Select your project `jgtpczpctfnenwedpcpr`
3. Go to **SQL Editor** → **New Query**
4. Copy and paste the contents of `supabase/migrations/20260516_fix_auth_trigger.sql`
5. Click **Run**

#### Option 2: Using CLI
```bash
supabase migration up
```

#### Option 3: Manual Check
If migrations have already run, verify in Supabase Dashboard:
1. Go to **Auth** → check for a user account
2. Go to **SQL Editor** → Run this query:
   ```sql
   SELECT * FROM public.profiles WHERE user_id = '[USER_ID]';
   SELECT * FROM public.user_roles WHERE user_id = '[USER_ID]';
   ```
   Replace `[USER_ID]` with the ID from your auth user

## After Database Fix
1. Clear browser cache and localStorage
2. Log out completely
3. Try signing in again
4. Errors should stop, and you should stay logged in

## If Still Not Working

Check the browser DevTools Console for:
- Profile/role fetch warnings (normal, handled gracefully now)
- Any new errors starting with "Profile creation error" (means DB trigger still not running)

If DB trigger errors persist, reply with the exact error message and I'll provide additional fixes.
