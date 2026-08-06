-- 1. Fix scheduled race tick (extensions.http_post does not exist -> net.http_post)
CREATE EXTENSION IF NOT EXISTS pg_net;

SELECT cron.unschedule('legends-grid-race-tick');

SELECT cron.schedule(
  'legends-grid-race-tick',
  '* * * * *',
  $$
  select net.http_post(
    url := 'https://project--aef86bed-0f3c-4fa7-8148-b91969ec782b.lovable.app/api/public/hooks/tick',
    headers := '{"Content-Type": "application/json", "apikey": "sb_publishable_i1CiBhPGwL2UO5YuhXTCJQ_nBB_PsBq"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);

-- 2. Account-based premium entitlements
CREATE TABLE public.user_entitlements (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  credits integer NOT NULL DEFAULT 250,
  owned text[] NOT NULL DEFAULT '{}',
  save_slots integer NOT NULL DEFAULT 8,
  advanced_stats boolean NOT NULL DEFAULT false,
  theme text NOT NULL DEFAULT 'Standard',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.user_entitlements TO authenticated;
GRANT ALL ON public.user_entitlements TO service_role;

ALTER TABLE public.user_entitlements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own entitlements readable" ON public.user_entitlements
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_user_entitlements_updated_at
BEFORE UPDATE ON public.user_entitlements
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Multi-league support + online sponsor limit
ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS sponsor_signings integer NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS teams_user_league_unique
  ON public.teams (user_id, league_id)
  WHERE user_id IS NOT NULL;
