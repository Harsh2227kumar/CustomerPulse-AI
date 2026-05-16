# Complete Debugging Guide

## Step 1: Check Browser Console (Right Now!)

After you try to log in, open **DevTools Console** (F12) and look for messages starting with `[AUTH]`:

```
[AUTH] Fetching profile for user: ...
[AUTH] Profile fetch result: { data: {...}, error: null }
[AUTH] Profile found: ...
```

OR

```
[AUTH] Fetching profile for user: ...
[AUTH] Profile fetch result: { data: null, error: ... }
[AUTH] No profile found - CRITICAL: Database trigger may not have executed
```

**Copy and paste these exact messages** in your next reply.

---

## Step 2: Run Database Verification

Open your Supabase Dashboard and run the verification queries:

1. Go to https://app.supabase.com
2. Select project `jgtpczpctfnenwedpcpr`
3. Go to **SQL Editor** → **New Query**
4. Copy the contents of `DEBUG_DATABASE.sql` from this repository
5. Click **Run**

### What to look for in the results:

**Result 1 - Trigger Function:**
- Should show: `handle_new_user` function exists
- If NO results = ❌ Trigger function doesn't exist (migration wasn't run)

**Result 2 - Trigger:**
- Should show: `on_auth_user_created` trigger exists
- If NO results = ❌ Trigger doesn't exist (migration wasn't run)

**Result 3 - All Triggers on auth.users:**
- Should show at least the `on_auth_user_created` trigger
- If empty = ❌ No triggers at all

**Result 4 - Auth Users and Profiles:**
- Should show your users with matching profiles
- Example: 
  ```
  user_id: a03b2844...
  email: test@example.com
  full_name: test@example.com
  is_approved: true
  ```
- If profile column is NULL = ❌ Trigger didn't create profile

**Result 5 - User Roles:**
- Should show: `user_id` → `role` (e.g., 'manager')
- If empty/NULL = ❌ Trigger didn't create roles

**Result 6 - RLS Policies:**
- Should show multiple policies on `profiles` table
- Should include policies like "Users can view all profiles", "Users can update own profile"
- If empty = ❌ RLS policies not configured

---

## Step 3: What to Report

Run the commands above and report:

1. **Console Output**: Copy the `[AUTH]` messages from browser console
2. **SQL Result 1-3**: Tell me:
   - Does trigger function exist? (Yes/No)
   - Does trigger exist? (Yes/No)
3. **SQL Result 4**: Tell me:
   - Do you see your user in the list?
   - Does it have a profile_row?
   - What email/full_name shows?
4. **SQL Result 5**: Tell me:
   - Do you see user_roles for your user?
   - What roles are shown?

---

## Step 4: Execute the Migration (If Needed)

If Results 1-2 show nothing, the migration HASN'T been run yet:

1. Go to **SQL Editor** → **New Query**
2. Copy the entire content of `supabase/migrations/20260516_fix_auth_trigger.sql`
3. Paste into the editor
4. Click **Run**
5. You should see: `Success. No rows returned.`

Then retry logging in and check console again.

---

## Expected Flow After Fix

1. User clicks "Sign Up" with email/password
2. ✅ Auth user created in `auth.users` table
3. ✅ Trigger fires automatically
4. ✅ Profile created in `public.profiles` 
5. ✅ Role created in `public.user_roles` as 'manager'
6. ✅ App logs in successfully

If Step 3-5 doesn't happen = trigger not running.

---

## Next Steps

**Send me:**
1. Console output (`[AUTH]` messages)
2. Results from DEBUG_DATABASE.sql queries (just tell me what you see)
3. Any error messages shown

I'll then provide the exact fix based on what's actually happening in your database.
