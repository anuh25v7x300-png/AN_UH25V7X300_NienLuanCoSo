import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': `http://localhost:${process.env.FLOWER_API_PORT || 3001}` }, watch: { usePolling: true, interval: 500 } },
});
