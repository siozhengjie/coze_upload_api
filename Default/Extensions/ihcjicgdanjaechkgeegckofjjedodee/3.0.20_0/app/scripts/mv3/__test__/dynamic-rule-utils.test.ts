import * as dynamicRuleUtils from "../dynamic-rule-utils";
import { chrome } from "@/utils/polyfill";
import { isMV3 } from "@/utils/utils";

jest.mock("@/utils/polyfill", () => ({
    chrome: {
        declarativeNetRequest: {
            getDynamicRules: jest.fn(() => Promise.resolve([])),
            updateDynamicRules: jest.fn(() => Promise.resolve()),
            getSessionRules: jest.fn(() => Promise.resolve([])),
            getAvailableStaticRuleCount: jest.fn(() => Promise.resolve(100))
        },
        runtime: {
            lastError: null
        }
    }
}));

jest.mock("@/utils/utils", () => ({
    isMV3: jest.fn(() => true),
    urlHost: jest.fn((url) => new URL(url).hostname),
    browserName: jest.fn(() => "Chrome")
}));

describe("Dynamic Rule Utils", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("should return an empty array if MV3 is not enabled", async () => {
        (isMV3 as jest.Mock).mockReturnValueOnce(false);
        const result = await dynamicRuleUtils.getExistingDynamicRules();
        expect(result).toEqual([]);
    });

    test("should get existing dynamic rules", async () => {
        (chrome.declarativeNetRequest.getDynamicRules as jest.Mock).mockResolvedValueOnce([
            { id: 1, priority: 10 },
            { id: 2, priority: 20 }
        ]);
        const result = await dynamicRuleUtils.getExistingDynamicRules();
        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({ id: 1, priority: 10 });
    });

    test("should filter existing dynamic rules by priority", async () => {
        (chrome.declarativeNetRequest.getDynamicRules as jest.Mock).mockResolvedValueOnce([
            { id: 1, priority: 10 },
            { id: 2, priority: 20 }
        ]);
        const result = await dynamicRuleUtils.getExistingDynamicRules(10);
        expect(result).toEqual([{ id: 1, priority: 10 }]);
    });

    test("should get last dynamic rule ID", async () => {
        (chrome.declarativeNetRequest.getDynamicRules as jest.Mock).mockResolvedValueOnce([
            { id: 5 },
            { id: 10 }
        ]);
        const result = await dynamicRuleUtils.getLastDynamicRuleId();
        expect(result).toBe(10);
    });

    test("should clear all dynamic rules when MV3 is enabled", async () => {
        (chrome.declarativeNetRequest.getDynamicRules as jest.Mock).mockResolvedValueOnce([
            { id: 1 },
            { id: 2 }
        ]);
        await dynamicRuleUtils.clearAllDynamicRules();
        expect(chrome.declarativeNetRequest.updateDynamicRules).toHaveBeenCalledWith({
            addRules: [],
            removeRuleIds: [1, 2]
        });
    });
});
