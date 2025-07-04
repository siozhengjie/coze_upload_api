import { chrome } from "@/utils/polyfill";
import { sendBackgroundMessage, BackgroundMessageRequest, sendTabMessage } from "./messaging";

jest.mock("@/utils/polyfill", () => ({
    chrome: {
        runtime: {
            sendMessage: jest.fn(),
            lastError: null
        }
    }
}));

describe("sendBackgroundMessage", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (chrome.runtime as jest.Mocked<typeof chrome.runtime>).lastError = undefined;
    });

    it("should send message and return response successfully", async () => {
        const mockResponse = { payload: "test response" };
        (chrome.runtime.sendMessage as jest.Mock).mockImplementation((message, callback) => {
            callback(mockResponse);
        });

        const message: BackgroundMessageRequest<string> = {
            type: "TEST_MESSAGE",
            payload: "test payload"
        };

        const response = await sendBackgroundMessage(message);
        
        expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
            { type: "TEST_MESSAGE", payload: "test payload" },
            expect.any(Function)
        );
        expect(response).toEqual(mockResponse);
    });

    it("should handle runtime error and return error response", async () => {
        const errorMessage = "Runtime error occurred";
        (chrome.runtime.sendMessage as jest.Mock).mockImplementation((message, callback) => {
            (chrome.runtime as jest.Mocked<typeof chrome.runtime>).lastError = {
                message: errorMessage
            };
            callback(null);
        });

        const message: BackgroundMessageRequest<string> = {
            type: "TEST_MESSAGE"
        };

        const response = await sendBackgroundMessage(message);
        
        expect(response).toEqual({
            error: errorMessage,
            payload: undefined
        });
    });

    describe("sendTabMessage", () => {
        beforeEach(() => {
            jest.clearAllMocks();
            (chrome as any).tabs = {
                sendMessage: jest.fn()
            };
            (chrome.runtime as jest.Mocked<typeof chrome.runtime>).lastError = undefined;
        });

        it("should send message to tab and return response successfully", async () => {
            const mockResponse = { success: true };
            (chrome.tabs.sendMessage as jest.Mock).mockResolvedValue(mockResponse);

            const tabId = 123;
            const message = { type: "TEST_TAB_MESSAGE" };

            const response = await sendTabMessage(tabId, message);
            
            expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(tabId, message);
            expect(response).toEqual(mockResponse);
        });

        it("should handle runtime error", async () => {
            const errorMessage = "Tab does not exist";
            (chrome.tabs.sendMessage as jest.Mock).mockImplementation(() => {
                (chrome.runtime as jest.Mocked<typeof chrome.runtime>).lastError = {
                    message: errorMessage
                };
                return Promise.resolve(undefined);
            });

            const tabId = 456;
            const message = { type: "TEST_TAB_MESSAGE" };

            const response = await sendTabMessage(tabId, message);
            
            expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(tabId, message);
            expect(response).toBeUndefined();
        });

        it("should handle exception thrown when sending message", async () => {
            const error = new Error("Failed to send message");
            (chrome.tabs.sendMessage as jest.Mock).mockRejectedValue(error);

            const tabId = 789;
            const message = { type: "TEST_TAB_MESSAGE" };

            const response = await sendTabMessage(tabId, message);
            
            expect(chrome.tabs.sendMessage).toHaveBeenCalledWith(tabId, message);
            expect(response).toBeUndefined();
        });
    });
});