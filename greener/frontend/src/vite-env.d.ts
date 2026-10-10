/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Endereço base do backend NestJS (ex.: http://localhost:3001). */
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
