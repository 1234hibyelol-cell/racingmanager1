-- profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL,
  rating integer NOT NULL DEFAULT 1000,
  xp integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX profiles_username_key ON public.profiles (lower(username));
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles readable by authenticated" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)) || '-' || substr(NEW.id::text, 1, 4))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- leagues
CREATE TABLE public.leagues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  tier integer NOT NULL DEFAULT 1,
  season integer NOT NULL DEFAULT 1,
  round integer NOT NULL DEFAULT 0,
  next_race_at timestamptz NOT NULL DEFAULT now() + interval '1 hour',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.leagues TO authenticated;
GRANT ALL ON public.leagues TO service_role;
ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;
CREATE POLICY "leagues readable" ON public.leagues FOR SELECT TO authenticated USING (true);

-- teams
CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  is_bot boolean NOT NULL DEFAULT true,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#e11d48',
  budget bigint NOT NULL DEFAULT 8000000,
  points integer NOT NULL DEFAULT 0,
  wins integer NOT NULL DEFAULT 0,
  strategy text NOT NULL DEFAULT 'normal',
  hq jsonb NOT NULL DEFAULT '{"garage":1,"windTunnel":1,"simulator":1,"academy":1,"marketing":1}'::jsonb,
  research jsonb NOT NULL DEFAULT '{"unlocked":[],"points":0,"engine":0,"aero":0,"chassis":0,"tyres":0,"reliability":0}'::jsonb,
  staff jsonb NOT NULL DEFAULT '{"engineer":40,"mechanic":40,"strategist":40,"designer":40}'::jsonb,
  drivers jsonb NOT NULL DEFAULT '[]'::jsonb,
  sponsor jsonb NOT NULL DEFAULT '{"id":null,"perRace":0,"name":null}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (league_id, user_id)
);
CREATE INDEX teams_league_idx ON public.teams (league_id);
CREATE INDEX teams_user_idx ON public.teams (user_id);
GRANT SELECT, UPDATE ON public.teams TO authenticated;
GRANT ALL ON public.teams TO service_role;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "teams readable" ON public.teams FOR SELECT TO authenticated USING (true);
CREATE POLICY "own team update" ON public.teams FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- races
CREATE TABLE public.races (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  season integer NOT NULL DEFAULT 1,
  round integer NOT NULL,
  track_id text NOT NULL,
  track_name text NOT NULL,
  laps integer NOT NULL DEFAULT 24,
  current_lap integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'scheduled',
  weather text NOT NULL DEFAULT 'sun',
  temperature integer NOT NULL DEFAULT 24,
  safety_car boolean NOT NULL DEFAULT false,
  scheduled_at timestamptz NOT NULL,
  started_at timestamptz,
  finished_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX races_league_idx ON public.races (league_id, round);
CREATE INDEX races_status_idx ON public.races (status, scheduled_at);
GRANT SELECT ON public.races TO authenticated;
GRANT ALL ON public.races TO service_role;
ALTER TABLE public.races ENABLE ROW LEVEL SECURITY;
CREATE POLICY "races readable" ON public.races FOR SELECT TO authenticated USING (true);

-- race entries (live timing)
CREATE TABLE public.race_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  race_id uuid NOT NULL REFERENCES public.races(id) ON DELETE CASCADE,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid,
  team_name text NOT NULL,
  driver_name text NOT NULL,
  color text NOT NULL DEFAULT '#e11d48',
  grid integer NOT NULL DEFAULT 1,
  position integer NOT NULL DEFAULT 1,
  laps_done integer NOT NULL DEFAULT 0,
  total_ms bigint NOT NULL DEFAULT 0,
  gap_ms bigint NOT NULL DEFAULT 0,
  last_lap_ms integer NOT NULL DEFAULT 0,
  tyre integer NOT NULL DEFAULT 100,
  pit_count integer NOT NULL DEFAULT 0,
  dnf boolean NOT NULL DEFAULT false,
  points integer NOT NULL DEFAULT 0,
  pending_order text,
  mode text NOT NULL DEFAULT 'normal',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (race_id, team_id)
);
CREATE INDEX race_entries_race_idx ON public.race_entries (race_id, position);
GRANT SELECT, UPDATE ON public.race_entries TO authenticated;
GRANT ALL ON public.race_entries TO service_role;
ALTER TABLE public.race_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "entries readable" ON public.race_entries FOR SELECT TO authenticated USING (true);
CREATE POLICY "own entry order" ON public.race_entries FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- race events feed
CREATE TABLE public.race_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  race_id uuid NOT NULL REFERENCES public.races(id) ON DELETE CASCADE,
  lap integer NOT NULL DEFAULT 0,
  kind text NOT NULL DEFAULT 'info',
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX race_events_race_idx ON public.race_events (race_id, created_at);
GRANT SELECT ON public.race_events TO authenticated;
GRANT ALL ON public.race_events TO service_role;
ALTER TABLE public.race_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "events readable" ON public.race_events FOR SELECT TO authenticated USING (true);

-- season results
CREATE TABLE public.season_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid NOT NULL REFERENCES public.leagues(id) ON DELETE CASCADE,
  season integer NOT NULL,
  team_id uuid,
  user_id uuid,
  team_name text NOT NULL,
  position integer NOT NULL,
  points integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX season_results_league_idx ON public.season_results (league_id, season);
GRANT SELECT ON public.season_results TO authenticated;
GRANT ALL ON public.season_results TO service_role;
ALTER TABLE public.season_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "season results readable" ON public.season_results FOR SELECT TO authenticated USING (true);

-- chat
CREATE TABLE public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  league_id uuid REFERENCES public.leagues(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX chat_messages_league_idx ON public.chat_messages (league_id, created_at DESC);
GRANT SELECT, INSERT ON public.chat_messages TO authenticated;
GRANT ALL ON public.chat_messages TO service_role;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "chat readable" ON public.chat_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "chat insert own" ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND length(message) BETWEEN 1 AND 500);

-- friendships
CREATE TABLE public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, friend_id)
);
CREATE INDEX friendships_user_idx ON public.friendships (user_id);
CREATE INDEX friendships_friend_idx ON public.friendships (friend_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.friendships TO authenticated;
GRANT ALL ON public.friendships TO service_role;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "friendships visible to participants" ON public.friendships FOR SELECT TO authenticated USING (auth.uid() = user_id OR auth.uid() = friend_id);
CREATE POLICY "friendships insert own" ON public.friendships FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND user_id <> friend_id);
CREATE POLICY "friendships update participants" ON public.friendships FOR UPDATE TO authenticated USING (auth.uid() = user_id OR auth.uid() = friend_id) WITH CHECK (auth.uid() = user_id OR auth.uid() = friend_id);
CREATE POLICY "friendships delete participants" ON public.friendships FOR DELETE TO authenticated USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- realtime
ALTER TABLE public.races REPLICA IDENTITY FULL;
ALTER TABLE public.race_entries REPLICA IDENTITY FULL;
ALTER TABLE public.race_events REPLICA IDENTITY FULL;
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.races;
ALTER PUBLICATION supabase_realtime ADD TABLE public.race_entries;
ALTER PUBLICATION supabase_realtime ADD TABLE public.race_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;