import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Jamal's Finance",
    short_name: "Jamal's Finance",
    description:
      "A secure personal finance dashboard for accounts, expenses, goals, investments, payables, and reports.",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    background_color: "#F3F6FA",
    theme_color: "#07365F",
    orientation: "portrait-primary",
    categories: ["finance", "productivity", "utilities"],
    lang: "en",
    icons: [
      {
        src: "/api/app-icon/192?v=2",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/api/app-icon/512?v=2",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/api/app-icon/192?maskable=1&v=2",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/api/app-icon/512?maskable=1&v=2",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
