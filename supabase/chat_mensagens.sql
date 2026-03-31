-- Tabela de mensagens de chat entre recepção e profissionais
create table if not exists public.chat_mensagens (
  id uuid primary key default gen_random_uuid(),
  de_usuario_id uuid not null references public.usuarios (id) on delete cascade,
  para_usuario_id uuid not null references public.usuarios (id) on delete cascade,
  mensagem text not null,
  lida boolean not null default false,
  created_at timestamptz not null default now()
);

-- Índices para melhorar consultas por participante e ordem cronológica
create index if not exists chat_mensagens_de_idx on public.chat_mensagens (de_usuario_id, created_at desc);
create index if not exists chat_mensagens_para_idx on public.chat_mensagens (para_usuario_id, created_at desc);
create index if not exists chat_mensagens_participantes_idx
  on public.chat_mensagens (least(de_usuario_id, para_usuario_id), greatest(de_usuario_id, para_usuario_id), created_at desc);

