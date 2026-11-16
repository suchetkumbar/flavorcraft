-- The assistant gained three kinds of request: describing a named dish
-- ("target"), and reading ingredients off a photo of a plate or of a fridge.
alter table public.ai_requests drop constraint ai_requests_kind_check;
alter table public.ai_requests add constraint ai_requests_kind_check
  check (kind in ('swap', 'fix', 'target', 'dish-photo', 'pantry-photo'));
