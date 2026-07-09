import { defineConfig } from "vite";
import react, { reactCompilerPreset } from "@vitejs/plugin-react";

import babel from "@rolldown/plugin-babel";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    tsconfigPaths(),
    babel({ presets: [reactCompilerPreset()] }),
  ],
});
