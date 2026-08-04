DROP POLICY IF EXISTS "own team update" ON public.teams;
DROP POLICY IF EXISTS "own entry order" ON public.race_entries;
REVOKE UPDATE ON public.teams FROM authenticated;
REVOKE UPDATE ON public.race_entries FROM authenticated;