-- Feedback form (wontonvtt.app/feedback.html): anyone can submit, only signed-in users can read.
create table if not exists public.feedback (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  name text not null,
  character text,
  device text,
  rating int,
  likes text, dislikes text, changes text, additions text, bugs text,
  tried text,
  ua text
);
alter table public.feedback enable row level security;
drop policy if exists feedback_insert_anon on public.feedback;
create policy feedback_insert_anon on public.feedback for insert to anon, authenticated with check (true);
drop policy if exists feedback_read on public.feedback;
create policy feedback_read on public.feedback for select to authenticated using (true);
