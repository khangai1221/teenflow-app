-- ============================================================================
-- TeenFlow schema — run this in the Supabase SQL Editor (once).
-- Families, member profiles (parent/kid), and tasks, with RLS + RPCs.
-- Safe to re-run: uses IF NOT EXISTS / CREATE OR REPLACE and drops policies.
-- ============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.families (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  code       text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  family_id    uuid references public.families(id) on delete set null,
  role         text not null check (role in ('parent', 'kid')),
  display_name text not null,
  age          int,
  avatar_url   text,
  points       int  not null default 0,
  streak_days  int  not null default 0,
  last_completed_date date,
  created_at   timestamptz not null default now()
);

alter table public.profiles add column if not exists last_completed_date date;

create table if not exists public.tasks (
  id             uuid primary key default gen_random_uuid(),
  family_id      uuid not null references public.families(id) on delete cascade,
  title          text not null,
  description    text,
  category       text not null default 'other' check (category in ('lesson','chore','rest','family','other')),
  priority       text not null default 'med'   check (priority in ('high','med','low')),
  points         int  not null default 0,
  scheduled_date date not null default current_date,
  scheduled_time time,
  duration_min   int,
  status         text not null default 'pending' check (status in ('pending','done')),
  assigned_to    uuid references public.profiles(id) on delete set null,
  created_by     uuid references public.profiles(id) on delete set null,
  completed_at   timestamptz,
  created_at     timestamptz not null default now(),
  photo_path     text,
  recurrence_id   uuid,
  recurrence_rule text
);

alter table public.tasks add column if not exists photo_path text;
alter table public.tasks add column if not exists recurrence_id uuid;
alter table public.tasks add column if not exists recurrence_rule text;

create index if not exists tasks_family_date_idx  on public.tasks (family_id, scheduled_date);
create index if not exists tasks_assigned_idx      on public.tasks (assigned_to);
create index if not exists tasks_recurrence_idx    on public.tasks (recurrence_id);

-- ---------------------------------------------------------------------------
-- Helper: current user's family id (SECURITY DEFINER bypasses RLS -> no recursion)
-- ---------------------------------------------------------------------------
create or replace function public.current_family_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select family_id from public.profiles where id = auth.uid();
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.families enable row level security;
alter table public.profiles enable row level security;
alter table public.tasks    enable row level security;

drop policy if exists families_select_member on public.families;
drop policy if exists families_update_member on public.families;
drop policy if exists families_update_parent on public.families;
create policy families_select_member on public.families
  for select using (id = public.current_family_id());
-- families_update_* is created further down, after current_is_parent() is
-- defined (a `using` clause is resolved against the catalog at CREATE POLICY
-- time, unlike a plpgsql body, so it can't forward-reference a function that
-- doesn't exist yet).

drop policy if exists profiles_select_family on public.profiles;
drop policy if exists profiles_insert_self  on public.profiles;
drop policy if exists profiles_update_self  on public.profiles;
create policy profiles_select_family on public.profiles
  for select using (id = auth.uid() or family_id = public.current_family_id());
create policy profiles_insert_self on public.profiles
  for insert with check (id = auth.uid());
create policy profiles_update_self on public.profiles
  for update using (id = auth.uid());

drop policy if exists tasks_select_family on public.tasks;
drop policy if exists tasks_insert_family on public.tasks;
drop policy if exists tasks_update_family on public.tasks;
drop policy if exists tasks_delete_family on public.tasks;
create policy tasks_select_family on public.tasks
  for select using (family_id = public.current_family_id());
create policy tasks_insert_family on public.tasks
  for insert with check (family_id = public.current_family_id());
create policy tasks_update_family on public.tasks
  for update using (family_id = public.current_family_id());
create policy tasks_delete_family on public.tasks
  for delete using (family_id = public.current_family_id());

-- ---------------------------------------------------------------------------
-- RPC: parent creates a family and joins it as the first member
-- ---------------------------------------------------------------------------
create or replace function public.create_family_and_join(
  p_family_name text,
  p_display_name text,
  p_age int,
  p_avatar_url text
)
returns table (family_id uuid, family_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid      uuid := auth.uid();
  v_alphabet text := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; -- no ambiguous chars
  v_code     text;
  v_i        int;
  v_family   uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if exists (select 1 from public.profiles where id = v_uid) then
    raise exception 'already_registered';
  end if;

  loop
    v_code := '';
    for v_i in 1..6 loop
      v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from public.families where code = v_code);
  end loop;

  insert into public.families (name, code)
  values (coalesce(nullif(trim(p_family_name), ''), p_display_name || ' family'), v_code)
  returning id into v_family;

  insert into public.profiles (id, family_id, role, display_name, age, avatar_url)
  values (v_uid, v_family, 'parent', p_display_name, p_age, p_avatar_url);

  return query select v_family, v_code;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: kid joins an existing family via its code
-- ---------------------------------------------------------------------------
create or replace function public.join_family(
  p_code text,
  p_display_name text,
  p_age int,
  p_avatar_url text
)
returns table (family_id uuid, family_code text)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_family uuid;
  v_code   text := upper(trim(p_code));
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if exists (select 1 from public.profiles where id = v_uid) then
    raise exception 'already_registered';
  end if;

  select id into v_family from public.families where code = v_code;
  if v_family is null then
    raise exception 'invalid_family_code';
  end if;

  insert into public.profiles (id, family_id, role, display_name, age, avatar_url)
  values (v_uid, v_family, 'kid', p_display_name, p_age, p_avatar_url);

  return query select v_family, v_code;
end;
$$;

-- ---------------------------------------------------------------------------
-- Helper: awards points (+ lifetime_points) and rolls the daily streak
-- forward for a task's assignee. Shared by set_task_status() and
-- review_task() — both mark a task "done" and pay it out identically, so
-- this is the one place that logic is allowed to live (previously the two
-- were copy-pasted and had already drifted out of sync in one comment).
-- Not itself granted to `authenticated`: it's only ever called from inside
-- another SECURITY DEFINER function, never directly via supabase.rpc().
-- ---------------------------------------------------------------------------
create or replace function public.award_task_completion(p_assigned_to uuid, p_points int)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_last date;
begin
  update public.profiles
    set points = points + p_points,
        lifetime_points = lifetime_points + p_points
    where id = p_assigned_to;

  select last_completed_date into v_last from public.profiles where id = p_assigned_to;
  if v_last is null or v_last < current_date - 1 then
    update public.profiles set streak_days = 1, last_completed_date = current_date
      where id = p_assigned_to;
  elsif v_last = current_date - 1 then
    update public.profiles set streak_days = streak_days + 1, last_completed_date = current_date
      where id = p_assigned_to;
  end if;
  -- v_last = current_date: today already counted, no change.
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: complete / un-complete a task, adjusting the assignee's points
-- ---------------------------------------------------------------------------
create or replace function public.set_task_status(p_task_id uuid, p_done boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family uuid := public.current_family_id();
  v_task   public.tasks;
begin
  select * into v_task from public.tasks where id = p_task_id;
  if v_task.id is null then
    raise exception 'task_not_found';
  end if;
  if v_task.family_id is distinct from v_family then
    raise exception 'forbidden';
  end if;

  if p_done and v_task.status <> 'done' then
    update public.tasks set status = 'done', completed_at = now() where id = p_task_id;
    if v_task.assigned_to is not null then
      perform public.award_task_completion(v_task.assigned_to, v_task.points);
    end if;
  elsif not p_done and v_task.status = 'done' then
    update public.tasks set status = 'pending', completed_at = null where id = p_task_id;
    if v_task.assigned_to is not null then
      update public.profiles set points = greatest(0, points - v_task.points) where id = v_task.assigned_to;
    end if;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Rewards catalog: parents define redeemable rewards; family members spend
-- points on them via the redeem_reward() RPC (atomic deduction + log entry).
-- ---------------------------------------------------------------------------
create table if not exists public.rewards (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid not null references public.families(id) on delete cascade,
  title      text not null,
  cost       int  not null check (cost > 0),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.reward_redemptions (
  id          uuid primary key default gen_random_uuid(),
  reward_id   uuid references public.rewards(id) on delete set null,
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  family_id   uuid not null references public.families(id) on delete cascade,
  title       text not null,
  cost        int  not null,
  redeemed_at timestamptz not null default now()
);

create index if not exists reward_redemptions_profile_idx on public.reward_redemptions (profile_id);

-- Helper: is the current user a parent in their family?
create or replace function public.current_is_parent()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select role = 'parent' from public.profiles where id = auth.uid()), false);
$$;

alter table public.rewards            enable row level security;
alter table public.reward_redemptions enable row level security;

drop policy if exists rewards_select_family on public.rewards;
drop policy if exists rewards_insert_parent on public.rewards;
drop policy if exists rewards_update_parent on public.rewards;
drop policy if exists rewards_delete_parent on public.rewards;
create policy rewards_select_family on public.rewards
  for select using (family_id = public.current_family_id());
create policy rewards_insert_parent on public.rewards
  for insert with check (family_id = public.current_family_id() and public.current_is_parent());
create policy rewards_update_parent on public.rewards
  for update using (family_id = public.current_family_id() and public.current_is_parent());
create policy rewards_delete_parent on public.rewards
  for delete using (family_id = public.current_family_id() and public.current_is_parent());

drop policy if exists redemptions_select_family on public.reward_redemptions;
create policy redemptions_select_family on public.reward_redemptions
  for select using (family_id = public.current_family_id());
-- No insert policy: rows are only ever written by redeem_reward() below,
-- which is security definer and validates everything itself.

-- ---------------------------------------------------------------------------
-- RPC: redeem a reward — atomically checks + deducts points and logs it
-- ---------------------------------------------------------------------------
create or replace function public.redeem_reward(p_reward_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid       uuid := auth.uid();
  v_family    uuid := public.current_family_id();
  v_reward    public.rewards;
  v_points    int;
  v_is_parent boolean := public.current_is_parent();
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select * into v_reward from public.rewards where id = p_reward_id;
  if v_reward.id is null or v_reward.family_id is distinct from v_family then
    raise exception 'reward_not_found';
  end if;

  if exists (
    select 1 from public.reward_redemptions
    where reward_id = p_reward_id and profile_id = v_uid and status = 'pending'
  ) then
    raise exception 'already_requested';
  end if;

  select points into v_points from public.profiles where id = v_uid;
  if v_points < v_reward.cost then
    raise exception 'insufficient_points';
  end if;

  if v_is_parent then
    -- Parents approve their own spending implicitly: deduct immediately.
    update public.profiles set points = points - v_reward.cost where id = v_uid;
    insert into public.reward_redemptions (reward_id, profile_id, family_id, title, cost, status)
    values (v_reward.id, v_uid, v_family, v_reward.title, v_reward.cost, 'approved');
  else
    -- Kids request; points are deducted only once a parent approves.
    insert into public.reward_redemptions (reward_id, profile_id, family_id, title, cost, status)
    values (v_reward.id, v_uid, v_family, v_reward.title, v_reward.cost, 'pending');
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Storage: private bucket for task-completion photos, one folder per family
-- (task_id-timestamp.ext under <family_id>/), so photos never leak across
-- families even though every member can read/write within their own folder.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('task-photos', 'task-photos', false)
on conflict (id) do nothing;

-- storage.objects has RLS enabled by default on every Supabase project and
-- is owned by supabase_storage_admin, not the SQL Editor's role — running
-- `alter table storage.objects enable row level security` here fails with
-- "must be owner of table objects", so it's deliberately omitted.

drop policy if exists task_photos_insert_family on storage.objects;
drop policy if exists task_photos_select_family on storage.objects;
drop policy if exists task_photos_update_family on storage.objects;
create policy task_photos_insert_family on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'task-photos'
    and (storage.foldername(name))[1] = public.current_family_id()::text
  );
create policy task_photos_select_family on storage.objects
  for select to authenticated
  using (
    bucket_id = 'task-photos'
    and (storage.foldername(name))[1] = public.current_family_id()::text
  );
create policy task_photos_update_family on storage.objects
  for update to authenticated
  using (
    bucket_id = 'task-photos'
    and (storage.foldername(name))[1] = public.current_family_id()::text
  );

-- ---------------------------------------------------------------------------
-- Approval workflows: tasks can require a parent's sign-off before points
-- are awarded, and reward requests from kids can require approval before
-- points are spent. `lifetime_points` tracks total points ever earned (never
-- decremented by spending) so achievements have a stable basis to unlock on.
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists lifetime_points int not null default 0;
-- One-time backfill for existing installs: we can't recover true historical
-- totals, so seed lifetime_points from the current balance.
update public.profiles set lifetime_points = points where lifetime_points = 0;

alter table public.tasks add column if not exists requires_approval boolean not null default false;

alter table public.tasks drop constraint if exists tasks_status_check;
alter table public.tasks add constraint tasks_status_check
  check (status in ('pending', 'awaiting_approval', 'done'));

alter table public.reward_redemptions add column if not exists status text not null default 'approved';
alter table public.reward_redemptions drop constraint if exists reward_redemptions_status_check;
alter table public.reward_redemptions add constraint reward_redemptions_status_check
  check (status in ('pending', 'approved', 'rejected', 'cancelled'));

-- ---------------------------------------------------------------------------
-- RPC: a kid submits a requires_approval task for parent review (no points
-- awarded yet — that happens in review_task on approval).
-- ---------------------------------------------------------------------------
create or replace function public.submit_task_for_approval(p_task_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family uuid := public.current_family_id();
  v_task   public.tasks;
begin
  select * into v_task from public.tasks where id = p_task_id;
  if v_task.id is null or v_task.family_id is distinct from v_family then
    raise exception 'task_not_found';
  end if;
  if v_task.status <> 'pending' then
    raise exception 'invalid_state';
  end if;
  if not v_task.requires_approval then
    raise exception 'no_approval_required';
  end if;

  update public.tasks set status = 'awaiting_approval', completed_at = now() where id = p_task_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: a parent approves or rejects a task awaiting review. Approval awards
-- points/streak (mirrors set_task_status) and bumps lifetime_points;
-- rejection just sends the task back to pending.
-- ---------------------------------------------------------------------------
create or replace function public.review_task(p_task_id uuid, p_approve boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family uuid := public.current_family_id();
  v_task   public.tasks;
begin
  if not public.current_is_parent() then
    raise exception 'forbidden';
  end if;

  select * into v_task from public.tasks where id = p_task_id;
  if v_task.id is null or v_task.family_id is distinct from v_family then
    raise exception 'task_not_found';
  end if;
  if v_task.status <> 'awaiting_approval' then
    raise exception 'not_awaiting_approval';
  end if;

  if p_approve then
    update public.tasks set status = 'done', completed_at = coalesce(v_task.completed_at, now())
      where id = p_task_id;
    if v_task.assigned_to is not null then
      perform public.award_task_completion(v_task.assigned_to, v_task.points);
    end if;
  else
    update public.tasks set status = 'pending', completed_at = null where id = p_task_id;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: a parent approves or rejects a pending reward request. Approval
-- re-checks the balance (it may have changed since the request) and deducts
-- points at approval time, not request time.
-- ---------------------------------------------------------------------------
create or replace function public.review_redemption(p_redemption_id uuid, p_approve boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family uuid := public.current_family_id();
  v_r      public.reward_redemptions;
  v_points int;
begin
  if not public.current_is_parent() then
    raise exception 'forbidden';
  end if;

  select * into v_r from public.reward_redemptions where id = p_redemption_id;
  if v_r.id is null or v_r.family_id is distinct from v_family then
    raise exception 'redemption_not_found';
  end if;
  if v_r.status <> 'pending' then
    raise exception 'not_pending';
  end if;

  if p_approve then
    select points into v_points from public.profiles where id = v_r.profile_id;
    if v_points < v_r.cost then
      raise exception 'insufficient_points';
    end if;
    update public.profiles set points = points - v_r.cost where id = v_r.profile_id;
    update public.reward_redemptions set status = 'approved' where id = p_redemption_id;
  else
    update public.reward_redemptions set status = 'rejected' where id = p_redemption_id;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: the requester withdraws their own still-pending reward request.
-- ---------------------------------------------------------------------------
create or replace function public.cancel_redemption_request(p_redemption_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_r public.reward_redemptions;
begin
  select * into v_r from public.reward_redemptions
    where id = p_redemption_id and profile_id = auth.uid();
  if v_r.id is null then
    raise exception 'redemption_not_found';
  end if;
  if v_r.status <> 'pending' then
    raise exception 'not_pending';
  end if;

  update public.reward_redemptions set status = 'cancelled' where id = p_redemption_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Storage: public bucket for member avatars, one folder per user (<uid>/…)
-- so members can only ever write their own file. Public read: avatars are
-- low-sensitivity and shown everywhere (home header, task rows, profile).
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists avatars_insert_self  on storage.objects;
drop policy if exists avatars_update_self  on storage.objects;
drop policy if exists avatars_delete_self  on storage.objects;
drop policy if exists avatars_select_public on storage.objects;
create policy avatars_insert_self on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_update_self on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_delete_self on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy avatars_select_public on storage.objects
  for select using (bucket_id = 'avatars');

-- Only a parent may rename the family (the `families_update_member` policy
-- this replaces allowed any member, including kids, to rewrite the row —
-- harmless while nothing used UPDATE, but no longer true now that a rename
-- feature exists). Placed here, not back in the original RLS block, because
-- current_is_parent() is only defined partway through the file, earlier
-- than this line but after that block — see the comment left in its place.
create policy families_update_parent on public.families
  for update using (id = public.current_family_id() and public.current_is_parent());

-- ---------------------------------------------------------------------------
-- RPC: a member (parent or kid) leaves their family. A parent may not leave
-- if they're the last parent and kids remain (no one left to approve
-- tasks/rewards) — remove the kids or promote is out of scope, so they're
-- simply blocked. Leaving deletes the profile outright (not just family_id
-- = null) so profiles_insert_self / create_family_and_join / join_family's
-- "already_registered" check treats them as a fresh signup, letting them
-- create or join a new family via /register. If they were the last member,
-- the now-empty family row is deleted too (tasks/rewards cascade with it).
-- ---------------------------------------------------------------------------
create or replace function public.leave_family()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid          uuid := auth.uid();
  v_family       uuid;
  v_role         text;
  v_parent_count int;
  v_kid_count    int;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select family_id, role into v_family, v_role from public.profiles where id = v_uid;
  if v_family is null then
    raise exception 'not_in_family';
  end if;

  if v_role = 'parent' then
    select count(*) into v_parent_count from public.profiles where family_id = v_family and role = 'parent';
    select count(*) into v_kid_count    from public.profiles where family_id = v_family and role = 'kid';
    if v_parent_count <= 1 and v_kid_count > 0 then
      raise exception 'last_parent';
    end if;
  end if;

  delete from public.profiles where id = v_uid;

  if not exists (select 1 from public.profiles where family_id = v_family) then
    delete from public.families where id = v_family;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- RPC: a parent removes a kid from the family (same profile-delete mechanics
-- as leave_family). Deliberately can't target another parent or self here —
-- removing a parent is out of scope; a parent leaves via leave_family().
-- ---------------------------------------------------------------------------
create or replace function public.remove_family_member(p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_family uuid := public.current_family_id();
  v_target public.profiles;
begin
  if not public.current_is_parent() then
    raise exception 'forbidden';
  end if;
  if p_member_id = auth.uid() then
    raise exception 'use_leave_family';
  end if;

  select * into v_target from public.profiles where id = p_member_id;
  if v_target.id is null or v_target.family_id is distinct from v_family then
    raise exception 'member_not_found';
  end if;
  if v_target.role <> 'kid' then
    raise exception 'cannot_remove_parent';
  end if;

  delete from public.profiles where id = p_member_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Web Push subscriptions: one row per browser/device a member has opted in
-- from. Family-scoped select/delete (not just "own") because sending a
-- notification to e.g. every parent, or pruning a dead endpoint after a
-- failed send, happens from *another* member's session (a kid submitting a
-- task needs to read/prune the parents' subscriptions to notify them).
-- ---------------------------------------------------------------------------
create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_profile_idx on public.push_subscriptions (profile_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists push_subscriptions_insert_self   on public.push_subscriptions;
drop policy if exists push_subscriptions_select_family  on public.push_subscriptions;
drop policy if exists push_subscriptions_delete_family  on public.push_subscriptions;
create policy push_subscriptions_insert_self on public.push_subscriptions
  for insert with check (profile_id = auth.uid());
create policy push_subscriptions_select_family on public.push_subscriptions
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = push_subscriptions.profile_id and p.family_id = public.current_family_id()
    )
  );
create policy push_subscriptions_delete_family on public.push_subscriptions
  for delete using (
    exists (
      select 1 from public.profiles p
      where p.id = push_subscriptions.profile_id and p.family_id = public.current_family_id()
    )
  );

-- ---------------------------------------------------------------------------
-- Performance indexes for columns the app actually filters on:
-- profiles.family_id is queried on every authenticated page load (the
-- member roster in (app)/layout.tsx) plus every parent/reward/task action
-- that looks up family members; rewards.family_id and
-- reward_redemptions.family_id+status back the three separate queries
-- rewards/page.tsx makes on every load. reward_redemptions_profile_idx
-- (originally profile_id-only) is upgraded to a composite covering the
-- profile_id+status lookups in rewards/page.tsx and profile/page.tsx —
-- `create index if not exists` alone won't widen an index that already
-- exists under that name, so it's dropped and recreated.
-- ---------------------------------------------------------------------------
create index if not exists profiles_family_idx on public.profiles (family_id);
create index if not exists rewards_family_idx  on public.rewards (family_id);
create index if not exists reward_redemptions_family_status_idx
  on public.reward_redemptions (family_id, status);

drop index if exists reward_redemptions_profile_idx;
create index if not exists reward_redemptions_profile_idx
  on public.reward_redemptions (profile_id, status);

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
grant execute on function public.current_family_id()                          to authenticated;
grant execute on function public.create_family_and_join(text, text, int, text) to authenticated;
grant execute on function public.join_family(text, text, int, text)            to authenticated;
grant execute on function public.set_task_status(uuid, boolean)                to authenticated;
grant execute on function public.current_is_parent()                          to authenticated;
grant execute on function public.redeem_reward(uuid)                          to authenticated;
grant execute on function public.submit_task_for_approval(uuid)               to authenticated;
grant execute on function public.review_task(uuid, boolean)                   to authenticated;
grant execute on function public.review_redemption(uuid, boolean)             to authenticated;
grant execute on function public.cancel_redemption_request(uuid)              to authenticated;
grant execute on function public.leave_family()                              to authenticated;
grant execute on function public.remove_family_member(uuid)                  to authenticated;
