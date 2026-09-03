-- Atomic windowed rate limiter over the existing rate_limit_buckets table.
-- Returns the bucket's count after this bump; callers allow the request when
-- the returned count is <= their limit. The count keeps incrementing past the
-- limit so remaining-quota math stays simple (never resets mid-window).
create or replace function public.bump_rate_limit(p_key text, p_window interval)
returns integer
language sql
as $$
  insert into public.rate_limit_buckets as b (key, count, reset_at)
  values (p_key, 1, now() + p_window)
  on conflict (key) do update set
    count = case when b.reset_at < now() then 1 else b.count + 1 end,
    reset_at = case when b.reset_at < now() then now() + p_window else b.reset_at end
  returning count;
$$;
