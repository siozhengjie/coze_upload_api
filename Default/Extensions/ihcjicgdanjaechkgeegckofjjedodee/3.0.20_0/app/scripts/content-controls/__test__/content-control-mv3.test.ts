import { Mv3ContentControls } from "../content-control-mv3";
import { getLastDynamicRuleId } from "@/app/scripts/mv3/dynamic-rule-utils";
import { chrome } from "@/utils/polyfill";

jest.mock("@/utils/polyfill.ts", () => ({
    chrome: {
        declarativeNetRequest: {
            getDynamicRules: jest.fn(),
            updateDynamicRules: jest.fn(),
        },
        runtime: {
            lastError: null,
            getManifest() {
                return {
                    version: "3.0.0",
                };
            }
        },
    },
}));

jest.mock("@/app/scripts/mv3/dynamic-rule-utils", () => ({
    getLastDynamicRuleId: jest.fn(),
    DYNAMIC_RULE_CONTENT_CONTROL_PRIORITY: 24,
    allResourceTypes: ["main_frame", "sub_frame"],
}));

describe("Mv3ContentControls", () => {

    let contentControls: Mv3ContentControls;

    beforeEach(() => {
        (chrome.declarativeNetRequest.getDynamicRules as jest.Mock).mockResolvedValue([]);
        (chrome.declarativeNetRequest.updateDynamicRules as jest.Mock).mockImplementation((_, callback) => {
            if (callback) callback();
        });
        contentControls = new Mv3ContentControls();
    });

    afterAll(() => {
        jest.clearAllMocks();
    });



    test("should initialize with empty cache", async () => {
        
        const resCache = await contentControls.getAll();

        expect(resCache).toBeInstanceOf(Map);

        expect(resCache.size).toBe(0);
    });

    
    test("should add item and update dynamic rules", async () => {
        (getLastDynamicRuleId as any).mockResolvedValue(1); // start from 1
        await contentControls.addItem("example.com", "test-category");

        expect(chrome.declarativeNetRequest.updateDynamicRules).toHaveBeenCalledWith({
            addRules: [
                expect.objectContaining({
                    id: 2, // we started from 1
                    priority: 24,
                    action: expect.objectContaining({
                        type: "redirect",
                        redirect: expect.objectContaining({
                            extensionPath: "/app/eventpages/block-mv3.html?type=user-block&url=example.com",
                        }),
                    }),
                    condition: expect.objectContaining({
                        urlFilter: "example.com",
                        resourceTypes: expect.arrayContaining(["main_frame", "sub_frame"]),
                    }),
                }),
            ],
            removeRuleIds: [],
        });

        expect(contentControls.CACHE.has("example.com")).toBe(true);
    });

    test("should delete item and remove dynamic rules", async () => {
        (chrome.declarativeNetRequest.getDynamicRules as jest.Mock).mockResolvedValue([
            { id: 2, condition: { urlFilter: "example.com" } },
        ]);

        await contentControls.deleteItem("example.com");

        expect(chrome.declarativeNetRequest.updateDynamicRules).toHaveBeenCalledWith({
            addRules: [],
            removeRuleIds: [2],
        }, expect.any(Function));
    });

    test("should return false when deleting non-existing item", async () => {
        (chrome.declarativeNetRequest.getDynamicRules as jest.Mock).mockResolvedValue([]);
        const result = await contentControls.deleteItem("nonexistent.com");
        expect(result).toBe(false);
    });

    test("should import content control list", async () => {
        (getLastDynamicRuleId as any).mockResolvedValue(1);
        const list = [["example.com", "test-category"], ["another.com", "scam-category"]];
        await contentControls.import(list);

        expect(contentControls.CACHE.size).toBe(2);
        expect(contentControls.CACHE.has("example.com")).toBe(true);
        expect(contentControls.CACHE.has("another.com")).toBe(true);
    });


    test("should delete all items", async () => {
        (chrome.declarativeNetRequest.getDynamicRules as jest.Mock).mockResolvedValue([
            { id: 1 }, { id: 2 }, { id: 3 }
        ]);
        const result = await contentControls.deleteAllItems();
        expect(result).toBe(true);
        expect(chrome.declarativeNetRequest.updateDynamicRules).toHaveBeenCalledWith({
            addRules: [],
            removeRuleIds: [1, 2, 3],
        }, expect.any(Function));
    });
});
