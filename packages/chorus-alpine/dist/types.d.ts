import type { ChorusCore } from "@pixelsprout/chorus-core";
declare global {
    const $table: (tableName: string) => any[];
    const $chorus: ChorusCore;
}
export {};
