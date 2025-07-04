import { chrome } from './polyfill';

export const getUUID = (): Promise<string> => {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(["uuid"], (result: { [key: string]: any }) =>
            chrome.runtime.lastError ?
                reject(chrome.runtime.lastError.message) :
                resolve(result.uuid)
        );
    });
};

// For items that don't rely on the the malwarebytes object
// See malwarebytes.settingsGet
export const simpleStorageGet = (keys: string | string[]| null): Promise<any> => {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(keys, (settings: { [key: string]: any }) =>
            chrome.runtime.lastError ?
                reject(chrome.runtime.lastError) :
                resolve(typeof keys === "string" ? settings[keys] : settings)
        );
    });
};


// If you are messing with native messaging or anything to do with
// `malwarebytes.SETTINGS` or `enableProtection` see `malwarebytes.settingsSet`
// this is only here for items that don't rely on the malwarebytes object
export const simpleStorageSet = (settings: { [key: string]: any }): Promise<boolean> => {
    return new Promise((res, rej) => {
        try {
            chrome.storage.local.set(settings, () =>
                chrome.runtime.lastError ?
                    rej(chrome.runtime.lastError) :
                    res(true)
            );
        } catch (e) {
            console.error("Setting failed: ", e);
            rej(e);
        }
    });
};
