import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Cargar variables de entorno (como API_KEY)
  // Fix: process.cwd() type error workaround, use '.' instead
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react()],
    // Esto asegura que process.env.API_KEY funcione en el navegador
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY)
    }
  };
});