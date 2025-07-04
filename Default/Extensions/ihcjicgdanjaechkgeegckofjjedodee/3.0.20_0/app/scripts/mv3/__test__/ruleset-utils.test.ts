import * as rulesetUtils from "../ruleset-utils.js";
import { simpleStorageGet, simpleStorageSet } from "@/utils/storage";
import { chrome } from "@/utils/polyfill";

jest.mock("@/utils/storage", () => ({
    simpleStorageGet: jest.fn(),
    simpleStorageSet: jest.fn()
}));

jest.mock("@/utils/polyfill", () => ({
    chrome: {
        declarativeNetRequest: {
            getEnabledRulesets: jest.fn(() => Promise.resolve([])),
            updateEnabledRulesets: jest.fn(() => Promise.resolve()),
            getAvailableStaticRuleCount: jest.fn(() => Promise.resolve(100)),
            getDynamicRules: jest.fn(() => Promise.resolve([]))
        },
        runtime: {
            getManifest: jest.fn(() => ({
                declarative_net_request: {
                    rule_resources: [
                        { id: "mbgc.mv3.whitelist" },
                        { id: "mbgc.mv3.ads" },
                        { id: "mbgc.mv3.malware" },
                        { id: "mbgc.mv3.easylist" },
                        { id: "mbgc.mv3.easyprivacy" }
                    ]
                }
            }))
        },
        tabs: {
            create: jest.fn()
        }
    }
}));

describe("Ruleset Utils", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("should initialize MV3 rulesets correctly", async () => {
        (simpleStorageGet as jest.Mock).mockResolvedValueOnce([]);
        
        await rulesetUtils.tryInitMV3Rulesets();

        expect(chrome.declarativeNetRequest.getEnabledRulesets).toHaveBeenCalled();
        expect(simpleStorageSet).toHaveBeenCalledWith({
            mv3RulesetSelection: expect.arrayContaining([
                "mbgc.mv3.whitelist",
                "mbgc.mv3.ads",
                "mbgc.mv3.malware",
                "mbgc.mv3.easylist",
                "mbgc.mv3.easyprivacy"
            ])
        });
    });

    test("should get rule statistics correctly", async () => {
        const stats = await rulesetUtils.getRuleStats();
        
        expect(stats).toEqual(expect.objectContaining({
            dynamicRuleCount: 0,
            staticRulesetCount: 0,
            staticRuleCount: expect.any(Number),
            availableStaticRuleCount: 100
        }));
    });

    test("should toggle enabled ruleset", async () => {
        await rulesetUtils.toggleEnabledRuleset("mbgc.mv3.ads", false);
        
        expect(chrome.declarativeNetRequest.updateEnabledRulesets).toHaveBeenCalled();
    });

    test("should disable static rules", async () => {
        (simpleStorageGet as jest.Mock).mockResolvedValueOnce([]);
        
        await rulesetUtils.disableStaticRules([{ ruleset: "mbgc.mv3.ads", ruleId: 123 }]);
        
        expect(simpleStorageSet).toHaveBeenCalledWith({
            mv3DisabledRules: [{ ruleset: "mbgc.mv3.ads", ruleId: 123 }]
        });
    });
});
