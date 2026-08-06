// Kontobasierte Premium-Daten für UI-Komponenten.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { buyEntitlement, claimDailyCredits, getEntitlements, type Entitlements } from "@/lib/entitlements.functions";
import { supabase } from "@/integrations/supabase/client";

export function useEntitlements() {
  const qc = useQueryClient();
  const getFn = useServerFn(getEntitlements);
  const buyFn = useServerFn(buyEntitlement);
  const bonusFn = useServerFn(claimDailyCredits);

  const session = useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => (await supabase.auth.getUser()).data.user ?? null,
  });

  const query = useQuery<Entitlements>({
    queryKey: ["entitlements"],
    enabled: !!session.data,
    queryFn: () => getFn({ data: undefined }),
  });

  const set = (next: Entitlements) => qc.setQueryData(["entitlements"], next);

  const buy = useMutation({
    mutationFn: (itemId: string) => buyFn({ data: { itemId } }),
    onSuccess: set,
  });

  const bonus = useMutation({
    mutationFn: () => bonusFn({ data: undefined }),
    onSuccess: set,
  });

  return {
    signedIn: !!session.data,
    loading: session.isLoading || query.isLoading,
    data: query.data ?? null,
    buy,
    bonus,
  };
}
