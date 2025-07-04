import { getCurrentTabId, removePingAttributes, handlePingSanitizer } from '../content-ping-tracker-sanitizer';
import { recordPingTrackerRemoval } from '@/content-scripts/common-utils';

jest.mock('@/content-scripts/common-utils', () => ({
    recordPingTrackerRemoval: jest.fn(),
}));

jest.mock('@/app/scripts/ui-utils/ui-utils.js', () => ({
    settingsGetAsync: jest.fn(),
}));

jest.mock('@/utils/polyfill', () => ({
    chrome: {
      runtime: {
        sendMessage: jest.fn(),
        lastError: null,
      },
      storage: {
        local: {
          get: jest.fn(),
        },
      },
    },
}));

describe('getCurrentTabId', () => {
    beforeEach(() => {
    });

    it('should resolve with tabId when response is received', async () => {
        (chrome.runtime.sendMessage as jest.Mock).mockImplementation((_, callback) => {
            callback({ tabId: 123 });
        });
    
        await expect(getCurrentTabId()).resolves.toEqual({ tabId: 123 });
    });

    it('should reject with an error when no response is received', async () => {
        (chrome.runtime.sendMessage as jest.Mock).mockImplementation((_, callback) => callback(null));
        await expect(getCurrentTabId()).rejects.toThrow("Error getting tab info");
    });
});

describe('removePingAttributes', () => {
    beforeEach(() => {
        document.body.innerHTML = '<a href="#" ping="https://tracker.com"></a>';
    });

    it('should remove ping attribute from anchor elements and call recordPingTrackerRemoval', () => {
        const tabId = 123;
        const pageUrl = 'example.com';
        const removedLinks = removePingAttributes(tabId, pageUrl);

        expect(removedLinks.length).toBe(1);
        expect(removedLinks[0].hasAttribute('ping')).toBe(false);
        expect(recordPingTrackerRemoval).toHaveBeenCalledWith(tabId, pageUrl);
    });
});

describe('handlePingSanitizer', () => {
    beforeEach(() => {
        document.body.innerHTML = '<a href="#" ping="https://tracker.com"></a>';
        jest.clearAllMocks();
    });

    it('should remove ping attributes on DOMContentLoaded', () => {
        const tabId = 123;
        const pageUrl = 'example.com';
        handlePingSanitizer(tabId, pageUrl);

        expect(document.querySelectorAll('a[ping]').length).toBe(0);
        expect(recordPingTrackerRemoval).toHaveBeenCalledWith(tabId, pageUrl);
    });
});

describe('getCurrentTabId', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should resolve with tabId when response is received', async () => {
        (chrome.runtime.sendMessage as jest.Mock).mockImplementation((_, callback) => {
            callback({ tabId: 123 });
        });
    
        await expect(getCurrentTabId()).resolves.toEqual({ tabId: 123 });
    });

    it('should reject with an error when no response is received', async () => {
        (chrome.runtime.sendMessage as jest.Mock).mockImplementation((_, callback) => callback(null));
        await expect(getCurrentTabId()).rejects.toThrow("Error getting tab info");
    });

    it('should reject with an error when chrome.runtime.sendMessage throws an error', async () => {
        (chrome.runtime.sendMessage as jest.Mock).mockImplementation(() => {
            throw new Error("Unexpected error");
        });
        await expect(getCurrentTabId()).rejects.toThrow("Unexpected error");
    });

});

describe('removePingAttributes', () => {
    beforeEach(() => {
        const newNode = document.createElement('div');
        newNode.innerHTML = '<a href="/index.html" ping="https://tracker.com"></a><a href="/test.php"></a>';
        jest.clearAllMocks();
    });

    it('should remove ping attribute from anchor elements and call recordPingTrackerRemoval', () => {
        const tabId = 123;
        const pageUrl = 'example.com';
        const newNode = document.createElement('div');
        newNode.innerHTML = '<a href="/index.html" ping="https://tracker.com"></a><a href="/test.php"></a>';
        document.body.appendChild(newNode);
        const removedLinks = removePingAttributes(tabId, pageUrl);

        expect(removedLinks.length).toBe(1);
        expect(removedLinks[0].hasAttribute('ping')).toBe(false);
        expect(recordPingTrackerRemoval).toHaveBeenCalledWith(tabId, pageUrl);
    });

    it('should not call recordPingTrackerRemoval if no anchor elements have ping attribute', () => {
        document.body.innerHTML = '<a href="#"></a>';
        const tabId = 123;
        const pageUrl = 'example.com';
        const removedLinks = removePingAttributes(tabId, pageUrl);

        expect(removedLinks.length).toBe(0);
        expect(recordPingTrackerRemoval).not.toHaveBeenCalled();
    });

    it('should handle multiple anchor elements with ping attribute', () => {
        document.body.innerHTML = '<a href="#" ping="https://tracker1.com"></a><a href="#" ping="https://tracker2.com"></a>';
        const tabId = 123;
        const pageUrl = 'example.com';
        const removedLinks = removePingAttributes(tabId, pageUrl);

        expect(removedLinks.length).toBe(2);
        removedLinks.forEach(link => {
            expect(link.hasAttribute('ping')).toBe(false);
        });
        expect(recordPingTrackerRemoval).toHaveBeenCalledTimes(2);
        expect(recordPingTrackerRemoval).toHaveBeenCalledWith(tabId, pageUrl);
    });
});
