import { createFileRoute } from "@tanstack/react-router";

// Wird minütlich vom Zeitplan aufgerufen und simuliert alle laufenden Ligarennen serverseitig.
export const Route = createFileRoute("/api/public/hooks/tick")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = request.headers.get("apikey");
        const expected = process.env["SUPABASE_PUBLISHABLE_KEY"];
        if (!expected || key !== expected) {
          return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401,
            headers: { "content-type": "application/json" },
          });
        }
        try {
          const { runTick } = await import("@/lib/online-sim.server");
          const result = await runTick();
          return Response.json({ ok: true, ...result });
        } catch (error) {
          console.error("[tick] failed", error);
          return new Response(JSON.stringify({ ok: false, error: String(error) }), {
            status: 500,
            headers: { "content-type": "application/json" },
          });
        }
      },
    },
  },
});
