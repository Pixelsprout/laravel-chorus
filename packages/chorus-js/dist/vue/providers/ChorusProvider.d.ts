export declare function useChorus(): {
    isInitialized: import("vue").Ref<boolean>;
    tables: Record<string, import("../..").TableState>;
    schema: Record<string, any>;
    initializationError: import("vue").Ref<string | null>;
    chorusCore: import("../..").ChorusCore;
};
