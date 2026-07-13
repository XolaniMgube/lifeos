-- ============================================================
-- LifeOS — Create your single account (pre-confirmed, no email needed)
-- Run this ONCE in Supabase → SQL Editor → New query.
-- 1. Change the email and password below first.
-- 2. Run it. Then sign in at /login with those credentials.
-- (Prefer clicking? Dashboard → Authentication → Users → Add user →
--  tick "Auto Confirm User". That does the same thing.)
-- ============================================================

-- Create the auth user, already email-confirmed.
insert into auth.users (
  instance_id, id, aud, role, email,
  encrypted_password, email_confirmed_at,
  created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data
) values (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated', 'authenticated',
  'you@example.com',                              -- ← your email
  crypt('change-this-password', gen_salt('bf')),  -- ← your password
  now(), now(), now(),
  '{"provider":"email","providers":["email"]}',
  '{}'
);

-- Matching identity row (required for email/password login on modern Supabase).
insert into auth.identities (
  id, user_id, provider_id, identity_data, provider,
  created_at, updated_at, last_sign_in_at
)
select
  gen_random_uuid(), u.id, u.id::text,
  jsonb_build_object('sub', u.id::text, 'email', u.email),
  'email', now(), now(), now()
from auth.users u
where u.email = 'you@example.com';                -- ← same email as above
