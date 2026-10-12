-- War Table v18 upgrade: homebrew bestiary, handouts, session journal, image storage.
-- Run once in Supabase → SQL Editor. Safe to re-run.

-- 1) Homebrew monsters live on the campaign (DM-owned row)
alter table public.campaigns add column if not exists bestiary jsonb not null default '[]'::jsonb;

-- 2) Lore notes become handouts / party notes / DM-only notes, with images and reveal
alter table public.lore_notes add column if not exists kind text not null default 'note';
alter table public.lore_notes add column if not exists title text not null default '';
alter table public.lore_notes add column if not exists visible boolean not null default true;
alter table public.lore_notes add column if not exists image_url text;

drop policy if exists lore_upd on public.lore_notes;
create policy lore_upd on public.lore_notes for update
  using (author_id = auth.uid() or exists (select 1 from public.campaigns c where c.id = lore_notes.campaign_id and c.dm_id = auth.uid()))
  with check (author_id = auth.uid() or exists (select 1 from public.campaigns c where c.id = lore_notes.campaign_id and c.dm_id = auth.uid()));
drop policy if exists lore_del on public.lore_notes;
create policy lore_del on public.lore_notes for delete
  using (author_id = auth.uid() or exists (select 1 from public.campaigns c where c.id = lore_notes.campaign_id and c.dm_id = auth.uid()));

-- 3) Session journal: auto-log, story notes, DM recap + context
create table if not exists public.journal (
  id text primary key,
  campaign_id text not null references public.campaigns(id) on delete cascade,
  kind text not null default 'story',          -- auto | story | recap | context
  author_id uuid references auth.users(id) on delete set null,
  author_name text,
  body text not null default '',
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists journal_campaign_idx on public.journal(campaign_id, created_at);
alter table public.journal enable row level security;
alter table public.journal replica identity full;

drop policy if exists journal_sel on public.journal;
create policy journal_sel on public.journal for select using (
  exists (select 1 from public.campaign_members m where m.campaign_id = journal.campaign_id and m.user_id = auth.uid())
  or exists (select 1 from public.campaigns c where c.id = journal.campaign_id and c.dm_id = auth.uid()));
drop policy if exists journal_ins on public.journal;
create policy journal_ins on public.journal for insert with check (
  author_id = auth.uid() and (
    exists (select 1 from public.campaign_members m where m.campaign_id = journal.campaign_id and m.user_id = auth.uid())
    or exists (select 1 from public.campaigns c where c.id = journal.campaign_id and c.dm_id = auth.uid())));
drop policy if exists journal_upd on public.journal;
create policy journal_upd on public.journal for update using (
  author_id = auth.uid() or exists (select 1 from public.campaigns c where c.id = journal.campaign_id and c.dm_id = auth.uid()));
drop policy if exists journal_del on public.journal;
create policy journal_del on public.journal for delete using (
  author_id = auth.uid() or exists (select 1 from public.campaigns c where c.id = journal.campaign_id and c.dm_id = auth.uid()));

do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'journal') then
    alter publication supabase_realtime add table public.journal;
  end if;
end $$;

-- 4) Public image bucket for handouts (signed-in users upload; anyone with the link can view)
insert into storage.buckets (id, name, public) values ('handouts', 'handouts', true)
  on conflict (id) do update set public = true;
drop policy if exists handouts_read on storage.objects;
create policy handouts_read on storage.objects for select using (bucket_id = 'handouts');
drop policy if exists handouts_write on storage.objects;
create policy handouts_write on storage.objects for insert to authenticated with check (bucket_id = 'handouts');
drop policy if exists handouts_del on storage.objects;
create policy handouts_del on storage.objects for delete to authenticated using (bucket_id = 'handouts' and owner = auth.uid());
