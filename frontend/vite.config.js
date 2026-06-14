import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Force a single three.js instance — importing three/examples/jsm (SkeletonUtils
  // for skinned-mesh cloning in the spike) can otherwise pull a 2nd copy, which
  // breaks instanceof checks and skinned-mesh cloning. Fixes the
  // "Multiple instances of Three.js" warning.
  resolve: {
    dedupe: ['three', '@react-three/fiber', '@react-three/drei'],
  },
  server: {
    port: Number(process.env.PORT) || 5173,
    // Allow importing the shared spike sim module that lives outside /frontend
    // (../shared/spike/world.mjs) — imported by both this client and the Node server.
    fs: {
      allow: ['..']
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      // Phase-0 spike: proxy the authoritative tick server's WebSocket so the client
      // connects same-origin (ws://<host>/spike-ws -> ws://localhost:3002).
      '/spike-ws': {
        target: 'ws://localhost:3002',
        ws: true,
        rewrite: (p) => p.replace(/^\/spike-ws/, '')
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
