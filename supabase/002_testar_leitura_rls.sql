-- Opcional: teste de leitura RLS sem depender dos filtros do aplicativo.
-- Faça os testes com duas contas A/B e backups existentes, como no guia.
-- Substitua COLE_UUID_A e COLE_UUID_B pelos IDs das duas contas de TESTE.
-- Este script não altera backups; a configuração de sessão é revertida ao final.
begin;
set local role authenticated;
select set_config(
  'request.jwt.claims',
  '{"sub":"COLE_UUID_B","role":"authenticated"}',
  true
);
select auth.uid() as deve_ser_o_uuid_de_b;

-- Deve retornar 1 depois que B enviar um backup.
select count(*) as backups_do_proprio_b
from public.jarvis_profiles where user_id = (select auth.uid());

-- Deve retornar 0, mesmo existindo um backup de A no banco.
select count(*) as backups_de_a_visiveis_para_b
from public.jarvis_profiles where user_id = 'COLE_UUID_A'::uuid;
rollback;

-- Se a contagem de A for maior que 0, revise todas as políticas da tabela.
-- Políticas permissivas adicionais também podem conceder acesso.
-- Isso verifica leitura. As políticas de escrita ainda requerem testes próprios
-- de INSERT/UPDATE/DELETE com tokens de usuários de teste no seu ambiente.
