-- A shared moodboard also says where its archive pieces lie on the sheet, so the public page can
-- open a piece's page from its label. Only what that needs is returned: the sheet's format and,
-- for each piece, its id, position and width (in board units). Nothing else of the content.
-- Boards saved before formats existed have no "format": the page treats them as the old sheet.

create or replace function public.get_shared_moodboard(slug text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'title', m.title,
    'updated_at', m.updated_at,
    'preview_path', m.preview_path,
    'format', m.content ->> 'format',
    'pieces', coalesce((
      select jsonb_agg(distinct el ->> 'objectId')
      from jsonb_array_elements(coalesce(m.content -> 'elements', '[]'::jsonb)) el
      where el ->> 'type' = 'photo' and el ? 'objectId'
    ), '[]'::jsonb),
    'labels', coalesce((
      select jsonb_agg(jsonb_build_object(
        'objectId', el ->> 'objectId',
        'x', el -> 'x',
        'y', el -> 'y',
        'width', el -> 'width'
      ))
      from jsonb_array_elements(coalesce(m.content -> 'elements', '[]'::jsonb)) el
      where el ->> 'type' = 'photo' and el ? 'objectId'
    ), '[]'::jsonb)
  )
  from moodboards m
  where m.share_slug is not null and m.share_slug = slug;
$$;

grant execute on function public.get_shared_moodboard(text) to anon, authenticated;
