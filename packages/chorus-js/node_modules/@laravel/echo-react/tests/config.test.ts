import { beforeEach, describe, expect, it, vi } from "vitest";
import { configureEcho, echo } from "../src";

describe("echo helper", async () => {
    beforeEach(() => {
        vi.resetModules();
    });

    it("throws error when Echo is not configured", async () => {
        expect(() => echo()).toThrow("Echo has not been configured");
    });

    it("creates Echo instance with proper configuration", async () => {
        configureEcho({
            broadcaster: "null",
        });

        expect(echo()).toBeDefined();
        expect(echo().options.broadcaster).toBe("null");
    });
});
