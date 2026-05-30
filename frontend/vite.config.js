import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    // No sourcemaps in the public production bundle: they add ~1.7 MB of .map
    // transfer to the CDN, append sourceMappingURL comments, slow the build,
    // and expose original source. A developer who needs to debug a built bundle
    // can opt back in with `vite build --mode development`.
    sourcemap: mode !== 'production',
    rollupOptions: {
      output: {
        // Split the large, rarely-changing framework code into its own chunk so
        // it caches across app deploys (app code changes far more often than
        // React/Router). Leaflet stays in its own lazy MapView chunk already.
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
}));
