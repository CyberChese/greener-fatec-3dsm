/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Endereço base do backend NestJS (ex.: http://localhost:3001). */
  readonly VITE_API_URL?: string
  /** 'simulated' liga os dados de demonstração; qualquer outro valor usa o backend real. */
  readonly VITE_DATA_SOURCE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
