/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ION_TOKEN: string;
  // Add any other custom VITE_ variables here
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
