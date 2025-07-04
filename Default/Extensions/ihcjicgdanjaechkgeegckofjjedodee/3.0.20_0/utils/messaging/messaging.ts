import {chrome} from "@/utils/polyfill";
export interface BackgroundMessageRequest<T> {
    type: string;
    payload?: T;
}

export interface BackgroundMessageResponse<T> {
    error?: string;
    payload?: T;
    // TODO: when chrome is migrated, get rid of this and use payload instead for methods like getCurrentTabData
    success?: any;
}

export async function sendBackgroundMessage<T, U>(
    message: BackgroundMessageRequest<T>
): Promise<BackgroundMessageResponse<U>> {
    console.debug(`MESSAGING: Sending message to script: ${message.type}`);
    return new Promise<BackgroundMessageResponse<U>>((resolve) => {
        chrome.runtime.sendMessage(
            {type: message.type, payload: message.payload},
            function (response: unknown) {
                if (chrome.runtime.lastError) {
                    console.error("MESSAGING: Got error from script: ", {
                        msg: message.type,
                        error: chrome.runtime.lastError.message,
                    });
                    resolve({
                        error: chrome.runtime.lastError.message,
                        payload: undefined,
                    });
                    return;
                }

                console.debug("MESSAGING: Got raw response: ", {response});
                const typedResponse = response as BackgroundMessageResponse<U>;
                resolve(typedResponse);
                console.debug("MESSAGING: Got response from script: ", {
                    msg: message.type,
                    response,
                    typedResponse,
                });
            }
        );
    });
}

export interface TabMessage {
    type: string;
}

export async function sendTabMessage(
    tabId: number,
    message: TabMessage
): Promise<any> {
    try {
        const response = await chrome.tabs.sendMessage(tabId, message);
        if (chrome.runtime.lastError) {
            console.error("MESSAGING: Error occurred while sending message to tab: ", {
                message,
                tabId,
                error: chrome.runtime.lastError.message,
            });
        }
        return response;
    } catch (error) {
        console.warn("MESSAGING: Error occurred while sending message to tab: ", {
            message,
            tabId,
            error,
        });
    }
}