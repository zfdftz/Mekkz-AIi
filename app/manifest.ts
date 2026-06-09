import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "mekkz AI",
    short_name: "mekkz AI",
    description:
      "Your multilingual AI assistant: chat, create images, and analyze photos.",
    start_url: "/",
    display: "standalone",
    background_color: "#050810",
    theme_color: "#059669",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png"
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png"
      }
    ]
  };
}
