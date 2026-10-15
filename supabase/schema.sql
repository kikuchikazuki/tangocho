-- ユーザーごとに単語帳全体を1行で保存します。
create table if not exists public.flashcard_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.flashcard_states enable row level security;

create policy "Users can read their own flashcards"
  on public.flashcard_states for select
  using (auth.uid() = user_id);

create policy "Users can insert their own flashcards"
  on public.flashcard_states for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own flashcards"
  on public.flashcard_states for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
