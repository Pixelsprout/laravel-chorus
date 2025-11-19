import type { ChorusCore } from "@pixelsprout/chorus-core";

// Global Alpine magic methods available in templates
declare global {
  // Magic methods available in Alpine templates
  const $table: (tableName: string) => any[];
  const $chorus: ChorusCore;
}

export {};
