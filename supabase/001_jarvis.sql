-- Fusion MK XIV. Integração avançada opcional: execute no SEU projeto Supabase.
-- Backup por usuário. Nenhuma chave service_role é usada pelo aplicativo.
begin;

create table if not exists public.jarvis_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  constraint jarvis_payload_object check (jsonb_typeof(payload) = 'object'),
  constraint jarvis_payload_limit check (octet_length(payload::text) <= 4194304)
);

alter table public.jarvis_profiles enable row level security;
alter table public.jarvis_profiles force row level security;
revoke all on public.jarvis_profiles from anon;
grant select, insert, update, delete on public.jarvis_profiles to authenticated;

drop policy if exists jarvis_owner_select on public.jarvis_profiles;
drop policy if exists jarvis_owner_insert on public.jarvis_profiles;
drop policy if exists jarvis_owner_update on public.jarvis_profiles;
drop policy if exists jarvis_owner_delete on public.jarvis_profiles;

create policy jarvis_owner_select on public.jarvis_profiles for select to authenticated
using ((select auth.uid()) = user_id);
create policy jarvis_owner_insert on public.jarvis_profiles for insert to authenticated
with check ((select auth.uid()) = user_id);
create policy jarvis_owner_update on public.jarvis_profiles for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
create policy jarvis_owner_delete on public.jarvis_profiles for delete to authenticated
using ((select auth.uid()) = user_id);

create or replace function public.jarvis_touch_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
revoke all on function public.jarvis_touch_updated_at() from public, anon, authenticated;
drop trigger if exists jarvis_profiles_updated_at on public.jarvis_profiles;
create trigger jarvis_profiles_updated_at before update on public.jarvis_profiles
for each row execute function public.jarvis_touch_updated_at();

commit;

-- Verificação de estrutura e políticas (não comprova isolamento entre contas):
select schemaname, tablename, policyname, cmd, roles
from pg_policies where schemaname = 'public' and tablename = 'jarvis_profiles';

-- Teste real a realizar na sua conta:
-- 1. Entre como usuário A no aplicativo, envie backup e saia.
-- 2. Entre como usuário B e tente restaurar. Deve retornar "Não há backup nessa conta".
-- 3. Envie um backup de B; saia e entre como A. O backup de A deve permanecer.
-- Execute esse teste com contas de teste, nunca com service_role, que ignora RLS.
