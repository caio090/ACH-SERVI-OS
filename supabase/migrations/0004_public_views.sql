-- ACHÔ SERVIÇO — views públicas
-- Expõem apenas os campos não sensíveis, mesmo com RLS restrita nas tabelas base.
-- (view sem security_invoker roda com o privilégio do owner, que é dono das
-- tabelas e portanto não sofre a RLS restritiva de "somente o próprio dono" —
-- padrão comum para expor dados públicos com RLS estrita na tabela base.)

create view public.public_professional_profiles as
select
  pp.id,
  p.full_name,
  p.avatar_path,
  p.city,
  p.neighborhood,
  pp.bio,
  pp.service_areas,
  pp.is_active,
  pp.is_verified,
  pp.average_rating,
  pp.review_count,
  pp.response_rate
from public.professional_profiles pp
join public.profiles p on p.id = pp.id
where pp.is_active = true and p.is_suspended = false;

grant select on public.public_professional_profiles to anon, authenticated;
