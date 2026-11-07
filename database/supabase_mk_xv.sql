-- J.A.R.V.I.S. MK XV: execute no SQL Editor do SEU projeto Supabase.
-- Login usa Supabase Auth. Cada usuário só lê o próprio snapshot.
begin;
create table if not exists public.jarvis_workspaces (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  revision bigint not null default 0 check (revision >= 0),
  payload jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.jarvis_workspaces enable row level security;
revoke all on public.jarvis_workspaces from public, anon, authenticated;
grant select on public.jarvis_workspaces to authenticated;
drop policy if exists jarvis_read_own on public.jarvis_workspaces;
create policy jarvis_read_own on public.jarvis_workspaces for select to authenticated
  using (auth.uid() = owner_id);

create or replace function public.jarvis_load_workspace()
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_row public.jarvis_workspaces%rowtype;
begin
  if v_user is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  select * into v_row from public.jarvis_workspaces where owner_id = v_user;
  if not found then return jsonb_build_object('revision', 0, 'workspace', null); end if;
  return jsonb_build_object('revision', v_row.revision, 'workspace', v_row.payload, 'updatedAt', v_row.updated_at);
end;
$$;

create or replace function public.jarvis_save_workspace(p_workspace jsonb, p_expected_revision bigint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_revision bigint;
begin
  if v_user is null then raise exception 'authentication_required' using errcode = '42501'; end if;
  if p_workspace is null or jsonb_typeof(p_workspace) <> 'object'
    or coalesce(p_workspace->>'version', '') <> '4'
    or coalesce(jsonb_typeof(p_workspace->'settings'), '') <> 'object'
    or coalesce(jsonb_typeof(p_workspace->'threads'), '') <> 'array'
    or octet_length(p_workspace::text) > 4194304
    or jsonb_array_length(p_workspace->'threads') > 40
    or (p_workspace->'settings') ?| array['key','apiKey','api_key','secret','token','connection','headers']
    or p_workspace ?| array['key','apiKey','api_key','secret','token','connection','credentials'] then
    raise exception 'invalid_workspace' using errcode = '22023';
  end if;
  if p_expected_revision is null or p_expected_revision < 0 then raise exception 'invalid_revision' using errcode = '22023'; end if;
  -- Bloqueia concorrência por usuário, inclusive a primeira inserção.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_user::text, 0));
  select revision into v_revision from public.jarvis_workspaces where owner_id = v_user for update;
  v_revision := coalesce(v_revision, 0);
  if v_revision <> p_expected_revision then raise exception 'workspace_conflict' using errcode = '40001'; end if;
  insert into public.jarvis_workspaces(owner_id, revision, payload, updated_at)
  values(v_user, v_revision + 1, p_workspace, now())
  on conflict(owner_id) do update set revision = excluded.revision, payload = excluded.payload, updated_at = excluded.updated_at;
  return jsonb_build_object('revision', v_revision + 1);
end;
$$;
revoke all on function public.jarvis_load_workspace() from public, anon;
revoke all on function public.jarvis_save_workspace(jsonb,bigint) from public, anon;
grant execute on function public.jarvis_load_workspace() to authenticated;
grant execute on function public.jarvis_save_workspace(jsonb,bigint) to authenticated;
commit;
