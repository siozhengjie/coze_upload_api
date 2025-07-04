import { SettingsStore } from './settings';
import {SETTING_ADS, SETTING_BLOCK_COUNT, SETTING_KILLSWITCH, SETTING_VERBOSE_LOGGING, type SettingKey} from "../types/settings";
import { chrome } from '@/utils/polyfill';
import { simpleStorageGet } from '@/utils/storage';

jest.mock('@/utils/storage');

describe('SettingsStore', () => {
    let settingsStore: SettingsStore;

    beforeEach(() => {
        settingsStore = SettingsStore.getInstance();
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should load settings on initialization', async () => {
        (simpleStorageGet as jest.Mock).mockResolvedValue({ key1: 'value1' });
        await settingsStore['loadSettings']();
        expect(settingsStore['cachedSettings']).toEqual({ key1: 'value1' });
    });

    it('should get setting from cache', async () => {
        settingsStore['cachedSettings'] = { [SETTING_VERBOSE_LOGGING]: 'true' };
    
        const value = await settingsStore.getSetting(SETTING_VERBOSE_LOGGING);
        expect(value).toBe('true');
    });

    it('should get setting from chrome storage if not in cache', async () => {
        (chrome.storage.local.get as jest.Mock).mockImplementation((key, callback) => {
           
            callback({ [SETTING_BLOCK_COUNT]: 'value2' });
        });
        const value = await settingsStore.getSetting(SETTING_BLOCK_COUNT);
        expect(value).toBe('value2');
        expect(settingsStore['cachedSettings'][SETTING_BLOCK_COUNT]).toBe('value2');
    });
 
    it('should handle error when getting setting from chrome storage', async () => {
        chrome.runtime.lastError = new Error('Test error');
        (chrome.storage.local.get as jest.Mock).mockImplementation((key, callback) => {
            callback({});
        });
        const value = await settingsStore.getSetting(SETTING_ADS);
        expect(value).toBeUndefined();
    });

    it('should handle error when setting setting in chrome storage', async () => {
        chrome.runtime.lastError = new Error('Test error');
        (chrome.storage.local.set as jest.Mock).mockImplementation((items, callback) => {
            callback();
        });
        const result = await settingsStore.setSetting(SETTING_VERBOSE_LOGGING, 'value5');
        expect(result).toBe(false);
    });

    it('should return all cached settings', async () => {
        settingsStore['cachedSettings'] = { key1: SETTING_VERBOSE_LOGGING, key2: 'value2' };
        const allSettings = await settingsStore.getAllSettings();
        expect(allSettings).toEqual({ key1: SETTING_VERBOSE_LOGGING, key2: 'value2' });
    });

    it('should reset all settings', async () => {
        settingsStore['cachedSettings'] = { key1: SETTING_VERBOSE_LOGGING, key2: 'value2' };
        await settingsStore.reset();
        expect(settingsStore['cachedSettings']).toEqual({});
        expect(chrome.storage.local.clear).toHaveBeenCalled();
        expect(chrome.storage.sync.clear).toHaveBeenCalled();
    });
});