import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";

const rawPort = process.env.PORT;

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH;

if (!basePath) {
  throw new Error(
    "BASE_PATH environment variable is required but was not provided.",
  );
}

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    runtimeErrorOverlay({
      // Prevent the overlay crash from looping back through the plugin:
      // if createErrorOverlay itself throws (document.body null in the Replit
      // iframe), that unhandledrejection must NOT be re-sent to the server or
      // the cycle becomes infinite.
      filter: (err: Error) => {
        const s = err.stack ?? "";
        // Errors from Vite's own client code are not app errors — skip them.
        if (s.includes("@vite/client")) return false;
        // The specific createErrorOverlay crash message.
        if (err.message?.includes("appendChild") && s.includes("createErrorOverlay")) return false;
        return true;
      },
    }),
    ...(process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    target: "es2020",
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          // PDF renderer est très lourd (~1.5MB) — chunk isolé
          if (id.includes("@tanstack"))                                       return "vendor-query";
          if (id.includes("react-hook-form") || id.includes("@hookform") || id.includes("/zod/")) return "vendor-forms";
          if (id.includes("@react-pdf")) return "vendor-pdf";
          // Recharts + D3 — uniquement sur la page Reports
          if (id.includes("recharts") || id.includes("/d3-")) return "vendor-charts";
          // React Big Calendar — uniquement sur la page Calendrier
          if (id.includes("react-big-calendar")) return "vendor-calendar";
          // Tous les composants Radix UI
          if (id.includes("@radix-ui")) return "vendor-radix";
          // React core + scheduler (dépendance interne de React) — dans le même chunk
          // pour éviter la dépendance circulaire vendor-react ↔ vendor
          if (
            id.includes("node_modules/react/") ||
            id.includes("node_modules/react-dom/") ||
            id.includes("node_modules/scheduler/")
          ) return "vendor-react";
          // Tout le reste de node_modules
          if (id.includes("node_modules")) return "vendor";
        },
      },
    },
  },
  server: {
    port,
    strictPort: true,
    host: "0.0.0.0",
    allowedHosts: true,
    fs: {
      strict: true,
      allow: [
        path.resolve(import.meta.dirname),
        path.resolve(import.meta.dirname, "../../lib"),
      ],
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
