// filepath: /Users/melgendi/Malwarebytes/code/browserguard-extension/guard-app/content-scripts/content-script-bridge/__test__/index.test.ts
import { MSG_CHECK_DOMAIN_ALLOW_LIST } from "@/app/scripts/app-consts.js";
import * as bridges from "../bridges";

// Mock the bridges module
jest.mock("../bridges", () => ({
  checkAllowListByTypeAndDomain: jest.fn(),
}));

// Mock console.warn
global.console.warn = jest.fn();
global.console.debug = jest.fn(); // Mock console.debug

describe("Content Script Bridge", () => {
  let eventCallback: (event: Partial<MessageEvent>) => void;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Spy on window.addEventListener and store the callback
    jest.spyOn(window, "addEventListener").mockImplementation((event, callback) => {
      if (event === "message") {
        eventCallback = callback as (event: Partial<MessageEvent>) => void;
      }
    });
    require("../index");
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should add an event listener for 'message' events", () => {
    expect(window.addEventListener).toHaveBeenCalledWith("message", expect.any(Function));
  });

  it("should ignore messages not from the same window", () => {
    eventCallback({ source: {} as Window, data: { type: MSG_CHECK_DOMAIN_ALLOW_LIST } });
    expect(bridges.checkAllowListByTypeAndDomain).not.toHaveBeenCalled();
  });

  it("should call checkAllowListByTypeAndDomain for MSG_CHECK_DOMAIN_ALLOW_LIST messages", () => {
    const mockData = { type: MSG_CHECK_DOMAIN_ALLOW_LIST, payload: "test" };
    eventCallback({ source: window, data: mockData });
    expect(bridges.checkAllowListByTypeAndDomain).toHaveBeenCalledWith(mockData);
  });

  it("should warn for unknown message types", () => {
    const mockData = { type: "UNKNOWN_MESSAGE_TYPE", payload: "test" };
    eventCallback({ source: window, data: mockData });
    expect(bridges.checkAllowListByTypeAndDomain).not.toHaveBeenCalled();
    expect(console.debug).toHaveBeenCalledWith(
      "Content Script Bridge: Unknown message type, ",
      "UNKNOWN_MESSAGE_TYPE"
    );
  });

  it("should not process events with no data", () => {
    eventCallback({ source: window });
    expect(bridges.checkAllowListByTypeAndDomain).not.toHaveBeenCalled();
    expect(console.debug).toHaveBeenCalledWith(
        "Content Script Bridge: Unknown message type, ",
        undefined
      );
  });

  it("should not process events with no data.type", () => {
    eventCallback({ source: window, data: {} });
    expect(bridges.checkAllowListByTypeAndDomain).not.toHaveBeenCalled();
    expect(console.debug).toHaveBeenCalledWith(
        "Content Script Bridge: Unknown message type, ",
        undefined
      );
  });
});
