-- ============================================================================
-- DEBUGGING SCRIPT - Run this in Supabase SQL Editor to diagnose the issue
-- ============================================================================

-- Step 1: Check if the trigger function exists
SELECT 
  proname,
  prosecdef,
  prokind
FROM pg_proc
WHERE proname = 'handle_new_user'
LIMIT 1;

-- Step 2: Check if the trigger exists
SELECT 
  tgname,
  tgisinternal,
  tgenabled
FROM pg_trigger
WHERE tgname = 'on_auth_user_created'
LIMIT 1;

-- Step 3: List all triggers on auth.users table
SELECT
  tgname,
  pg_get_triggerdef(oid) as trigger_definition
FROM pg_trigger
WHERE tgrelid = 'auth.users'::regclass;

-- Step 4: Check all auth users and their profiles
SELECT 
  au.id as user_id,
  au.email,
  p.full_name,
  p.is_approved,
  p.created_at
FROM auth.users au
LEFT JOIN public.profiles p ON p.user_id = au.id
ORDER BY au.created_at DESC
LIMIT 10;

-- Step 5: Check all user_roles
SELECT 
  ur.user_id,
  ur.role,
  p.full_name
FROM public.user_roles ur
LEFT JOIN public.profiles p ON p.user_id = ur.user_id
ORDER BY ur.user_id DESC
LIMIT 20;

-- Step 6: Check RLS policies on profiles table
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- Step 7: Check current user session info (run after you're logged in)
SELECT auth.uid();
