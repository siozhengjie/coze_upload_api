import { MV3ExclusionHandler } from "../exclusions-mv3";
import { MV2ExclusionHandler } from "../exclusions-mv2";
import { chrome } from "@/utils/polyfill";
import {
    getLastDynamicRuleId,
    getLastSessionRuleId,
    getExistingDynamicRulesByActionTypes,
    getExistingSessionRules,
    DYNAMIC_RULE_ADS_PRIORITY,
    DYNAMIC_RULE_MALWARE_PRIORITY,
    DYNAMIC_RULE_SCAMS_PRIORITY
} from "@/app/scripts/mv3/dynamic-rule-utils";
import { handleExcludedHost } from "@/app/scripts/app.js";
import {
    EXCLUSION_ADS,
    EXCLUSION_MALWARE,
    EXCLUSION_SCAMS,
    THREAT_TYPES
} from "@/app/scripts/app-consts";


jest.mock('@/utils/polyfill.ts', () => ({
    chrome: {
        declarativeNetRequest: {
            updateDynamicRules: jest.fn(),
            updateSessionRules: jest.fn()
        },
        runtime: {
            sendMessage: jest.fn(),
            lastError: null,
            getManifest: jest.fn().mockReturnValue({ version: '3.0.0' }),
            manifest_version: 3,
        },
        tabs: {
            create: jest.fn(),
        },
        i18n: {
            getMessage: jest.fn().mockReturnValue('Export Settings'),
        }
    },
}));


jest.mock("@/app/scripts/mv3/dynamic-rule-utils", () => {
    const actualModule = jest.requireActual("@/app/scripts/mv3/dynamic-rule-utils"); // Get the real module

    return {
        ...actualModule, // Spread all real exports
        getLastDynamicRuleId: jest.fn(() => Promise.resolve(1000)), // Mock only this function
        getLastSessionRuleId: jest.fn(() => Promise.resolve(1000)),
        getExistingDynamicRulesByActionTypes: jest.fn(() => Promise.resolve([])),
        getExistingSessionRules: jest.fn(() => Promise.resolve([])),
    };
});


jest.mock("@/app/scripts/app.js", () => ({
    handleExcludedHost: jest.fn((host, exclusions, flag, callback) => {
        callback({ success: true });
    })
}));

describe("MV3ExclusionHandler", () => {
    let exclusionHandler: MV3ExclusionHandler;

    beforeEach(() => {
        exclusionHandler = new MV3ExclusionHandler();
    });

    test("should extract exclusions correctly", () => {
        expect(exclusionHandler.extractExclusions("ads,malware"))
            .toEqual([THREAT_TYPES.ADS.type, THREAT_TYPES.MALWARE.type]);
        expect(exclusionHandler.extractExclusions([THREAT_TYPES.ADS.type, THREAT_TYPES.MALWARE.type]))
            .toEqual([THREAT_TYPES.ADS.type, THREAT_TYPES.MALWARE.type]);
    });

    
    test("should get correct priority for exclusions", () => {
        expect(exclusionHandler.getPriorityForExclusions([EXCLUSION_ADS])).toBe(DYNAMIC_RULE_ADS_PRIORITY);
        expect(exclusionHandler.getPriorityForExclusions([EXCLUSION_MALWARE])).toBe(DYNAMIC_RULE_MALWARE_PRIORITY);
        expect(exclusionHandler.getPriorityForExclusions([EXCLUSION_SCAMS])).toBe(DYNAMIC_RULE_SCAMS_PRIORITY);
    });

    test("should import exclusions and call handleExcludedHost", async () => {
        const exclusions = { "example.com": [THREAT_TYPES.ADS.ALLOWED_EXCLUSION_VALUE, THREAT_TYPES.MALWARE.ALLOWED_EXCLUSION_VALUE] }; // ads, malware
        await exclusionHandler.importExclusions(exclusions);
        expect(handleExcludedHost).toHaveBeenCalledWith("example.com", `${EXCLUSION_ADS},${EXCLUSION_MALWARE}`, true, expect.any(Function));
    });

    test("should get exclusions and filter by existing rules", async () => {
        jest.spyOn(MV2ExclusionHandler.prototype, "getExclusions").mockResolvedValue({ "example.com": [EXCLUSION_ADS] });
        jest.spyOn(exclusionHandler, "getExistingWhitelistDynamicRules").mockResolvedValue([{ condition: { urlFilter: "example.com" } }]);
        const exclusions = await exclusionHandler.getExclusions();
        expect(exclusions).toEqual({ "example.com": [EXCLUSION_ADS] });
    });

    test("should remove all exclusions and update dynamic rules", async () => {
        jest.spyOn(MV2ExclusionHandler.prototype, "removeAllExclusions").mockResolvedValue({});
        await exclusionHandler.removeAllExclusions();
        expect(chrome.declarativeNetRequest.updateDynamicRules).toHaveBeenCalled();
    });

    test("should remove specific exclusions and update dynamic rules", async () => {
        jest.spyOn(MV2ExclusionHandler.prototype, "removeExclude").mockResolvedValue({});
        await exclusionHandler.removeExclude("example.com", [EXCLUSION_ADS], false);
        expect(chrome.declarativeNetRequest.updateDynamicRules).toHaveBeenCalled();
    });

    test("should handle temporary exclusions correctly", async () => {
        await exclusionHandler.excludeTemporarily("example.com", 123);
        expect(chrome.declarativeNetRequest.updateSessionRules).toHaveBeenCalled();
        expect(exclusionHandler.isTemporarilyExcluded("example.com", 123)).toBe(true);
    });
});
