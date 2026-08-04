import { createFileRoute } from "@tanstack/react-router";
import { OnlineHub } from "@/components/online/hub";

export const Route = createFileRoute("/_authenticated/online")({
  head: () => ({
    meta: [
      { title: "Online-Liga – Legends Grid" },
      { name: "description", content: "Liga mit 20 Teams, stündliche serverseitige Rennen, Team-HQ, Forschungsbaum, Sponsoren, Chat und globale Ranglisten." },
      { property: "og:title", content: "Online-Liga – Legends Grid" },
      { property: "og:description", content: "Liga mit 20 Teams, stündliche Rennen, Team-HQ, Forschung, Sponsoren und Ranglisten." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OnlineHub,
});
