import { HeuristicSecurityScanner } from './HeuristicSecurityScanner';
import { RuleType, BlockURL } from './types';
import { chrome } from '@/utils/polyfill';
import { onScam } from '@/app/scripts/app';
import { simpleStorageSet } from '@/utils/storage';
import * as utils from '@/utils/utils';
import { ALWAYS_ALLOW } from '@/app/scripts/app-consts';
import { faker } from '@faker-js/faker';
import { DatabaseManager } from '@/app/scripts/databases';
import { Settings } from '@/app/scripts/settings';

jest.mock('@/utils/polyfill');
jest.mock('@/app/scripts/app', () => ({
    ...jest.requireActual('@/app/scripts/app'),
    onScam: jest.fn(),
}));
jest.mock('@/utils/storage');
jest.mock('@/app/scripts/settings');
jest.mock('@/app/scripts/databases');
jest.mock("@/utils/utils", () => {
  const originalModule = jest.requireActual("@/utils/utils");
  const partialMocked = Object.keys(originalModule).reduce(
    (pre, methodName) => {
      pre[methodName] = jest.fn();
      return pre;
    },
    {}
  );

  //Mock the default export and named export 'foo'
  return {
    __esModule: true,
    ...partialMocked,
    urlDomains: originalModule.urlDomains, // mock all methods of b except method3
    browserName: jest.fn(() => "Chrome"),
  };
});


describe('HeuristicSecurityScanner', () => {
    let scanner: HeuristicSecurityScanner;
    let mockMalwarebytes: any;
    let mockDatabaseManager: DatabaseManager;
    let mockSettings: Settings;
    beforeEach(() => {
        mockMalwarebytes = {
            recordAll: jest.fn(),
            updateBadgeCount: jest.fn(),
            isWhitelisted: jest.fn(),
            isWhitelistedScamsByPattern: jest.fn(),
            isProtectionActive: jest.fn(),
            DATABASES: {
                whitelist_scams_manual: 'whitelist_scams_manual',
                top1m: 'top1m',
                heuristics: 'heuristics'
            }
        };

        mockDatabaseManager = {
            getDatabases: jest.fn().mockReturnValue({
                whitelist_scams_manual: 'whitelist_scams_manual',
                top1m: 'top1m',
                heuristics: 'heuristics'
            }),
            getDatabaseByName: jest.fn().mockImplementation((name, settings) => {
                if (name === 'whitelist_scams_manual') {
                    return 'whitelist_scams_manual';
                } else if (name === 'top1m') {
                    return 'top1m';
                } else if (name === 'heuristics') {
                    return 'heuristics';
                }
            }),
            getAllAvailableDatabaseNames: jest.fn(),
            setDatabase: jest.fn(),
            updateDatabase: jest.fn(),
            updateDatabasesCache: jest.fn(),
            clear: jest.fn(),
            initDatabases: jest.fn(),
            getDatabaseNamesAndVersionsString: jest.fn(),
            getCachedDatabases: jest.fn(),
            getCachedDatabaseByName: jest.fn(),
            loadFromCache: jest.fn()            
        } as unknown as DatabaseManager;

        mockSettings = {
            getFromStorage: jest.fn(),
            setToStorage: jest.fn(),
            cachedDatabases: true,
            idbStorageDatabases: true,
            bundledDatabases: true,            
        } as unknown as Settings;

        scanner = new HeuristicSecurityScanner(mockMalwarebytes, mockDatabaseManager, mockSettings);
    });

    describe('shouldExcludeDomain', () => {
        it('should return false for non-SCAM/PHISHING threat types', async () => {
            const result = await scanner['shouldExcludeDomain']('example.com', false, RuleType.PHISHING);
            expect(result).toBeFalsy();
        });

        it('should check whitelists for SCAM threats', async () => {
            mockMalwarebytes.isWhitelisted.mockReturnValueOnce(true);
            const result = await scanner['shouldExcludeDomain']('example.com', false, RuleType.SCAM);
            console.log('SEXD: result: ', result);
            expect(result).toBeTruthy();
            expect(mockMalwarebytes.isWhitelisted).toHaveBeenCalledWith(
                'example.com',
                'whitelist_scams_manual',
                'Scams'
            );
        });

        Object.keys(ALWAYS_ALLOW).forEach((domain) => {
            it(`should check hard coded allowlist for SCAM threats: ${domain}`, () => {
                mockMalwarebytes.isWhitelisted.mockReturnValueOnce(false);
                const result = scanner['shouldExcludeDomain'](domain, false, RuleType.SCAM);

                expect(result).toBeTruthy();
                expect(mockMalwarebytes.isWhitelisted).not.toHaveBeenCalled();
            });

            it(`should check hard coded allowlist for PHISHING threats: ${domain}`, () => {
                mockMalwarebytes.isWhitelisted.mockReturnValueOnce(false);
                const result = scanner['shouldExcludeDomain'](domain, true, RuleType.PHISHING);
                
                expect(result).toBeTruthy();
                expect(mockMalwarebytes.isWhitelisted).not.toHaveBeenCalled();
            });

            it(`should check hard coded allowlist for PHISHING random subomains: ${domain}`, () => {
                mockMalwarebytes.isWhitelisted.mockReturnValueOnce(false);
                const result = scanner['shouldExcludeDomain'](`${faker.lorem.word()}.${domain}`, true, RuleType.PHISHING);

                expect(result).toBeTruthy();
                expect(mockMalwarebytes.isWhitelisted).not.toHaveBeenCalled();
            });
        });
 
    });

    describe('scanForThreats', () => {

        let mockUrls: BlockURL[] = [{
                    domain: 'scam.com',
                    isSilent: false,
                    type: RuleType.SCAM,
                    isAggressiveMode: false,
                    source: 'test',
                    id: 123
                }];
        
        beforeEach(() => {
            mockMalwarebytes.isProtectionActive.mockReturnValue(true);
            (utils.domain as jest.Mock).mockReturnValue('scam.com');
            (onScam as jest.Mock).mockReturnValue({ redirectUrl: 'block.html' });
            (chrome.tabs.update as jest.Mock).mockImplementation(() => Promise.resolve());
            (simpleStorageSet as jest.Mock).mockImplementation(() => Promise.resolve());
        });

        it('should not scan if ad protection is inactive', async () => {
            mockMalwarebytes.isProtectionActive.mockReturnValue(false);
            
            await scanner.scanForThreats(mockUrls, 'http://scam.com', 1);
            
            expect(chrome.tabs.update).not.toHaveBeenCalled();
        });

        it('should excute onScam() on detection', async () => {
            mockMalwarebytes.isWhitelisted.mockReturnValue(false);
            // await for the async function to resolve
            await scanner.scanForThreats(mockUrls, 'http://scam.com', 1);

            expect(onScam).toHaveBeenCalledWith(
                expect.objectContaining({
                    blockMessage: 'BTW: (NETWORK_BLOCK) heuristic scam domain found on undefined',
                    isSilent: false,
                    rule: 'heuristic_123',
                    selectedCheckedDBs: ['heuristics'],
                    subtype: 'scam_heuristic',
                    tabId: 1,
                    tabURL: 'http://scam.com',
                    type: 'scam',
                    url: 'http://scam.com'
                }),
            );
            expect(chrome.tabs.update).toHaveBeenCalledWith(1, { url: 'block.html' });
            expect(simpleStorageSet).toHaveBeenCalledWith({ lastDBused: null });
        });
    });
});