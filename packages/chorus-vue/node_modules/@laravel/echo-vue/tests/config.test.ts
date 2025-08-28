import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("echo helper", async () => {
    beforeEach(() => {
        vi.resetModules();
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it("throws error when Echo is not configured", async () => {
        const { echo } = await import("../src/config");

        expect(() => echo()).toThrow("Echo has not been configured");
    });

    it("creates Echo instance with proper configuration", async () => {
        const { configureEcho, echo } = await import("../src/config");

        configureEcho({
            broadcaster: "null",
        });

        expect(echo()).toBeDefined();
    });

    it("checks if Echo is configured", async () => {
        const { configureEcho, echoIsConfigured: echoIsConfigured } =
            await import("../src/config");

        expect(echoIsConfigured()).toBe(false);

        configureEcho({
            broadcaster: "null",
        });

        expect(echoIsConfigured()).toBe(true);
    });
});
