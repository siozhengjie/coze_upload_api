// filepath: /Users/melgendi/Malwarebytes/code/browserguard-extension/guard-app/content-scripts/content-script-bridge/__test__/bridges.test.ts
import { chrome } from '@/utils/polyfill';
import { checkAllowListByTypeAndDomain } from '../bridges';
import { MSG_CHECK_ALLOW_LIST_BY_TYPE_AND_DOMAIN, MSG_CHECK_DOMAIN_ALLOW_LIST_RESPONSE } from "@/app/scripts/app-consts.js";

// Mock chrome.runtime.sendMessage
jest.mock('@/utils/polyfill', () => ({
  chrome: {
    runtime: {
      sendMessage: jest.fn(),
    },
  },
}));

// Mock window.postMessage
global.window.postMessage = jest.fn();
// Mock console.error
global.console.debug = jest.fn();

describe('Bridge Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkAllowListByTypeAndDomain', () => {
    const mockData = {
      domainUrl: 'example.com',
      exclusionType: 'testType',
    };

    it('should send a message to the background script and post a response', () => {
      const mockResponse = { isAllowListed: true };
      (chrome.runtime.sendMessage as jest.Mock).mockImplementationOnce((message, callback) => {
        callback(mockResponse);
      });

      checkAllowListByTypeAndDomain(mockData);

      expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
        {
          type: MSG_CHECK_ALLOW_LIST_BY_TYPE_AND_DOMAIN,
          payload: {
            type: mockData.exclusionType,
            domainUrl: mockData.domainUrl,
          },
        },
        expect.any(Function)
      );

      expect(window.postMessage).toHaveBeenCalledWith(
        {
          type: MSG_CHECK_DOMAIN_ALLOW_LIST_RESPONSE,
          isAllowListed: mockResponse.isAllowListed,
        },
        '*'
      );
    });

    it('should handle a false response from the background script', () => {
        const mockResponse = { isAllowListed: false };
        (chrome.runtime.sendMessage as jest.Mock).mockImplementationOnce((message, callback) => {
          callback(mockResponse);
        });
  
        checkAllowListByTypeAndDomain(mockData);
  
        expect(window.postMessage).toHaveBeenCalledWith(
          {
            type: MSG_CHECK_DOMAIN_ALLOW_LIST_RESPONSE,
            isAllowListed: false,
          },
          '*'
        );
      });

    it('should handle an undefined response from the background script', () => {
        (chrome.runtime.sendMessage as jest.Mock).mockImplementationOnce((message, callback) => {
            callback(undefined);
        });

        checkAllowListByTypeAndDomain(mockData);

        expect(window.postMessage).toHaveBeenCalledWith(
            {
            type: MSG_CHECK_DOMAIN_ALLOW_LIST_RESPONSE,
            isAllowListed: false,
            },
            '*'
        );
    });

    it('should log an debug if domainUrl is missing', () => {
      checkAllowListByTypeAndDomain({ exclusionType: 'testType' });
      expect(console.debug).toHaveBeenCalledWith("Content Script Bridge: Invalid data received:", { exclusionType: 'testType' });
      expect(chrome.runtime.sendMessage).not.toHaveBeenCalled();
      expect(window.postMessage).not.toHaveBeenCalled();
    });

    it('should log an debug if exclusionType is missing', () => {
      checkAllowListByTypeAndDomain({ domainUrl: 'example.com' });
      expect(console.debug).toHaveBeenCalledWith("Content Script Bridge: Invalid data received:", { domainUrl: 'example.com' });
      expect(chrome.runtime.sendMessage).not.toHaveBeenCalled();
      expect(window.postMessage).not.toHaveBeenCalled();
    });

    it('should log an debug if both domainUrl and exclusionType are missing', () => {
        checkAllowListByTypeAndDomain({});
        expect(console.debug).toHaveBeenCalledWith("Content Script Bridge: Invalid data received:", {});
        expect(chrome.runtime.sendMessage).not.toHaveBeenCalled();
        expect(window.postMessage).not.toHaveBeenCalled();
      });
  });
});
