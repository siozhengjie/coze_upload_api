import { chrome } from './polyfill';

// Function to request native messaging permission
export const msgPromptNativeMsg = (): Promise<boolean> => {
    return new Promise((resolve) => {
        chrome.permissions.request(
            {
                permissions: ["nativeMessaging"],
            },
            (response: boolean) => {
                console.log("MMPPNM: Permissions request resp: ", response);
                // NOTE: connection occurs after Browser fires event in permissions.onAdded.addListener in app.js
                resolve(response);
            }
        );
    });
};

// Function to remove native messaging permission
export const msgRemoveNativeMessaging = (): Promise<boolean> => {
    return new Promise((resolve) => {
        chrome.permissions.remove(
            {
                permissions: ["nativeMessaging"],
            },
            (removed: boolean) => {
                if (removed) {
                    console.debug("MRNM: Successfully removed permissions");
                    // Boolean vals are reversed so they make sense in storage
                    resolve(false);
                } else {
                    console.log(
                        "MRNM: Did not remove permissions... ",
                        removed
                    );
                    resolve(true);
                }
            }
        );
    });
};
