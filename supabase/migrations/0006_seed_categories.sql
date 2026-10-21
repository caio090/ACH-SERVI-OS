-- ACHÔ SERVIÇO — categorias iniciais (seção 3 do plano mestre)
-- Exatamente as 15 categorias listadas, sem categorias extras de demonstração.

insert into public.categories (slug, name, icon, sort_order) values
  ('eletricista', 'Eletricista', '⚡', 1),
  ('encanador', 'Encanador', '🔧', 2),
  ('refrigeracao-ar-condicionado', 'Refrigeração / Ar-condicionado', '❄️', 3),
  ('pedreiro', 'Pedreiro', '🧱', 4),
  ('pintor', 'Pintor', '🎨', 5),
  ('servicos-gerais-faz-tudo', 'Serviços gerais / Faz-tudo', '🧰', 6),
  ('montador-de-moveis', 'Montador de móveis', '🪑', 7),
  ('chaveiro', 'Chaveiro', '🔑', 8),
  ('mecanico-socorro-leve', 'Mecânico / Socorro leve', '🚗', 9),
  ('tecnico-eletrodomesticos', 'Técnico de eletrodomésticos', '🔌', 10),
  ('diarista-limpeza', 'Diarista / Limpeza', '🧹', 11),
  ('jardinagem', 'Jardinagem', '🌿', 12),
  ('manicure-pedicure', 'Manicure / Pedicure', '💅', 13),
  ('cabeleireiro-barbeiro-domicilio', 'Cabeleireiro / Barbeiro a domicílio', '💈', 14),
  ('costureira-ajustes', 'Costureira / Ajustes', '🧵', 15);
