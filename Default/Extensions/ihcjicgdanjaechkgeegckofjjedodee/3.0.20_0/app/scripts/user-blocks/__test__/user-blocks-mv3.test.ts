import { Mv3UserBlocksHandler } from "@/app/scripts/user-blocks/user-blocks-mv3";
import { chrome } from "@/utils/polyfill";
import {
    getExistingDynamicRulesByActionTypes,
    getLastDynamicRuleId,
    supportedSubFrameResourceTypes,
} from "@/app/scripts/mv3/dynamic-rule-utils";
import { simpleStorageGet, simpleStorageSet } from "@/utils/storage";

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
        },
        storage: {
            local: {
                get: jest.fn(),
                set: jest.fn(),
                remove: jest.fn(),
            },
        },
    },
}));

jest.mock("@/app/scripts/mv3/dynamic-rule-utils", () => ({
    getExistingDynamicRulesByActionTypes: jest.fn(() => Promise.resolve([])),
    getLastDynamicRuleId: jest.fn(() => Promise.resolve(1000)),
    supportedSubFrameResourceTypes: jest.fn(() => [
        'sub_frame',
        'stylesheet',
        'script',
        'image',
        'font',
        'object',
        'xmlhttprequest',
        'ping',
        'csp_report',
        'media',
        'websocket',
        'other'
    ]),
    DYNAMIC_RULE_USER_BLOCKED_ITEMS_PRIORITY: 27
}));

jest.mock("@/utils/storage", () => ({
    simpleStorageGet: jest.fn(() => Promise.resolve({})),
    simpleStorageSet: jest.fn(() => Promise.resolve())
}));

describe("Mv3UserBlocksHandler", () => {
    let userBlocksHandler: Mv3UserBlocksHandler;

    beforeEach(() => {
        userBlocksHandler = new Mv3UserBlocksHandler();
    });

    test("should migrate blocked items correctly", async () => {
        (simpleStorageGet as jest.Mock).mockResolvedValueOnce(["example.com"]);
        (getExistingDynamicRulesByActionTypes as jest.Mock).mockResolvedValueOnce([{ id: 1 }]);
        (chrome.storage.local.remove as jest.Mock).mockImplementationOnce((key, callback) => callback?callback():Promise.resolve());

        await userBlocksHandler.migrateBlockedItems();

        expect(chrome.declarativeNetRequest.updateDynamicRules).toHaveBeenCalledWith({
            addRules: [],
            removeRuleIds: [1]
        });

        expect(simpleStorageGet).toHaveBeenCalledWith("blockedItems");
        expect(chrome.storage.local.remove).toHaveBeenCalledWith("blockedItems");
    });


    test("should import blocked items and update cache", async () => {
        const items = { "example.com": [{ blockUrls: ["https://ads.example.com"], xpath: "//*[@id='ad']" }] };
        await userBlocksHandler.importBlockedItems(items);

        expect(userBlocksHandler.CACHE.get("example.com")).toEqual(items["example.com"]);
    });

    test("should block an item and save it", async () => {
        const item = { domain: "example.com", blockUrls: ["https://ads.example.com"], xpath: "//*[@id='ad']" };
        await userBlocksHandler.blockItem(item);

        expect(userBlocksHandler.CACHE.get("example.com")).toEqual([{ blockUrls: ["https://ads.example.com"], xpath: "//*[@id='ad']" }]);
        expect(simpleStorageSet).toHaveBeenCalled();
    });


    test("should retrieve blocked items", async () => {
        const mockBlockedItems = {
            "example.com": [{ blockUrls: ["https://ads.example.com"], xpath: "//*[@id='ad']" }]
        };
        const mockCACHE = new Map<string, { blockUrls: string[], xpath: string }[]>();
        mockCACHE.set("example.com", [{ blockUrls: ["https://ads.example.com"], xpath: "//*[@id='ad']" }]);
    
        // Ensure storage returns the expected blocked items
        (simpleStorageGet as jest.Mock).mockResolvedValueOnce(mockBlockedItems);
    
        // Call getBlockedItems(), which internally calls loadSavedBlockedItems()
        const blockedItems = await userBlocksHandler.getBlockedItems();
    
        expect(blockedItems).toEqual(mockBlockedItems);
        expect(userBlocksHandler.CACHE).toEqual(mockCACHE);
    });


    test("should delete a blocked item", async () => {
        userBlocksHandler.CACHE.set("example.com", [{ blockUrls: ["https://ads.example.com"], xpath: "//*[@id='ad']" }]);

        await userBlocksHandler.deleteBlockedItem({ domain: "example.com", xpath: "//*[@id='ad']" });

        expect(userBlocksHandler.CACHE.get("example.com")).toEqual([]);
        expect(simpleStorageSet).toHaveBeenCalled();
    });

    test("should delete all blocked items", async () => {
        userBlocksHandler.CACHE.set("example.com", [{ blockUrls: ["https://ads.example.com"], xpath: "//*[@id='ad']" }]);
        
        await userBlocksHandler.deleteAllBlockedItems();

        expect(userBlocksHandler.CACHE.size).toBe(0);
        expect(simpleStorageSet).toHaveBeenCalled();
    });
    

    test("should check if a URL is blocked", () => {
        userBlocksHandler.CACHE.set("example.com", [{ blockUrls: ["https://ads.example.com"], xpath: "//*[@id='ad']" }]);

        expect(userBlocksHandler.isBlocked("example.com", "https://ads.example.com")).toBe(true);
        expect(userBlocksHandler.isBlocked("example.com", "https://safe.example.com")).toBe(false);
    });
    
    test("should update dynamic rules when saving blocked items", async () => {
        userBlocksHandler.CACHE.set("example.com", [
            { blockUrls: ["https://ads.example.com"], xpath: "//*[@id='ad']" }
        ]);
    
        await userBlocksHandler.saveBlockedItems();
    
        expect(simpleStorageSet).toHaveBeenCalledWith({
            userBlockedItems: { // Updated key to match your stored structure
                "example.com": [
                    { blockUrls: ["https://ads.example.com"], xpath: "//*[@id='ad']" }
                ]
            }
        });
    
        expect(chrome.declarativeNetRequest.updateDynamicRules).toHaveBeenCalled();
    });
});
