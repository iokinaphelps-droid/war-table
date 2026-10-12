-- Players can read the DM's own characters (PCs the DM plays, NPCs the DM runs) in campaigns they belong to.
drop policy if exists chars_dm_visible on public.characters;
create policy chars_dm_visible on public.characters for select using (
  exists (select 1 from public.campaigns c join public.campaign_members m on m.campaign_id = c.id
          where c.dm_id = characters.owner_id and m.user_id = auth.uid()));
