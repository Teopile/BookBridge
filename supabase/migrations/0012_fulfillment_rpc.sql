-- Atomic, race-safe crediting of book-request fulfillment.
--
-- Replaces the read-then-write loop in applyFulfillment() (server/db/store.js):
-- two deliveries crediting the same book_request concurrently could each read
-- the same quantity_fulfilled and clobber the other (lost update). This does it
-- in a single guarded UPDATE; LEAST(...) caps fulfilled at quantity_needed.
--
-- security definer + execute revoked from anon/authenticated: only the
-- service-role server (which already bypasses RLS) may call it. Idempotent.

create or replace function public.bb_credit_fulfillment(p_request_id uuid, p_qty integer)
returns void
language sql
security definer
set search_path = public
as $$
  update public.book_requests
     set quantity_fulfilled = least(
           coalesce(quantity_fulfilled, 0) + greatest(coalesce(p_qty, 0), 0),
           coalesce(quantity_needed, 0)
         )
   where id = p_request_id;
$$;

revoke execute on function public.bb_credit_fulfillment(uuid, integer) from public, anon, authenticated;
grant  execute on function public.bb_credit_fulfillment(uuid, integer) to service_role;
