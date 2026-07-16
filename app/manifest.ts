import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Jamal's Finance",
    short_name: "Jamal Finance",
    description:
      "A secure personal finance dashboard for accounts, expenses, goals, investments, payables, and reports.",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    background_color: "#F6F8FB",
    theme_color: "#3559E0",
    orientation: "portrait-primary",
    categories: ["finance", "productivity", "utilities"],
    lang: "en",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
