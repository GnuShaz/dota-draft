import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// На GitHub Pages сайт живёт в подпапке /<имя-репозитория>/, путь приходит из workflow.
export default defineConfig({
  base: process.env.BASE_PATH ?? "/",
  plugins: [react()],
});