import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

/**
 * Builds one self-contained .html file (video and artwork inlined) so the
 * board can be previewed by double-clicking, with no server and no install.
 * Used for review only - the shipping app is the Electron build.
 */
export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile()],
  build: {
    outDir: 'preview',
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    reportCompressedSize: false
  }
});
