import { chrome } from '@/utils/polyfill';
import {
    MSG_CHECK_DOMAIN_ALLOW_LIST_RESPONSE,
    MSG_CHECK_ALLOW_LIST_BY_TYPE_AND_DOMAIN,
} from "@/app/scripts/app-consts.js"

export const checkAllowListByTypeAndDomain = (data: any): void => {
    const domainUrl = data.domainUrl;
    const type = data.exclusionType;
    if (!domainUrl || !type) {
        console.debug("Content Script Bridge: Invalid data received:", data);
        return;
    } else {
        // Send message to background/service worker
        chrome.runtime.sendMessage(
            {
                type: MSG_CHECK_ALLOW_LIST_BY_TYPE_AND_DOMAIN,
                payload: {
                    type,
                    domainUrl,
                },
            },
            (response) => {
                // Send response back to page context
                window.postMessage(
                    {
                        type: MSG_CHECK_DOMAIN_ALLOW_LIST_RESPONSE,
                        isAllowListed: response?.isAllowListed || false,
                    },
                    "*"
                );
            }
        );
    }
}