import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
    // Dentro do Docker (principalmente no Windows e no macOS) o sistema de arquivos
    // montado nem sempre avisa o Vite das mudanças. O polling resolve isso.
    // Se o consumo de CPU incomodar e o hot reload funcionar sem ele, pode remover.
    watch: { usePolling: true },
  },
})
