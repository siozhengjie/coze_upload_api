import { 
    FLAG_ENABLE_SEARCH_HIJACKING_NOTIFICATION, 
    MSG_ADD_ALLOW_TEMPORARY, 
    SETTING_SEARCH_HIJACKING_NOTIFICATION 
} from "@/app/scripts/app-consts";
import { settingsGetAsync, featureFlagGetAsync } from "@/app/scripts/ui-utils/ui-utils.js";
import { displaySearchHijackingNotification } from "../content-notifications";
import { urlHost } from "@/utils/utils";

export type FeatureSetting = {
    featureFlag: boolean;
    userSetting: boolean;
}
export function getFeatureSettings(): Promise<FeatureSetting> {
    return new Promise(async (resolve, reject) => {
        let SearchHijackingSettings: FeatureSetting;
        try {
            const featureFlag = await featureFlagGetAsync(FLAG_ENABLE_SEARCH_HIJACKING_NOTIFICATION);
            const userSetting = await settingsGetAsync(SETTING_SEARCH_HIJACKING_NOTIFICATION);
            SearchHijackingSettings = {
                featureFlag,
                userSetting
            };
            resolve(SearchHijackingSettings);
        } catch (error) {
            console.error("Error fetching search hijacking toggle settings:", error);
            reject(error);
        }
    });
}

export function isKnownSearchHijacking(tabUrl: string): boolean {
    const searchHijackingList = [
        /search\?(\w+)=(.+)?(help|call|connect|contact|touch|give|support|assistance|verify|confirm|claim|please|dial|reach|speak|resolve|discuss|information|details|process|arrange|action)(.+)(\d{1,2}[\s.-])?\(?\d{3}\)?[\s.-]\d{3,4}[\s.-]\d{4}/gi,
        /search\/\?(\w+)=(.+)?(help|call|connect|contact|touch|give|support|assistance|verify|confirm|claim|please|dial|reach|speak|resolve|discuss|information|details|process|arrange|action)(.+)(\d{1,2}[\s.-])?\(?\d{3}\)?[\s.-]\d{3,4}[\s.-]\d{4}/gi,
        /search\?(\w+)=(.+)?(help|call|connect|contact|touch|give|support|assistance|verify|confirm|claim|please|dial|reach|speak|resolve|discuss|information|details|process|arrange|action)(.+)(\d{1,2}[\s.-])?\(?\d{3}\)?[\s.-]\d{3,4}[\s.-]\d{4}/gi,
        /search(&|&amp;)(\w+)=(.+)?(help|call|connect|contact|touch|give|support|assistance|verify|confirm|claim|please|dial|reach|speak|resolve|discuss|information|details|process|arrange|action)(.+)(\d{1,2}[\s.-])?\(?\d{3}\)?[\s.-]\d{3,4}[\s.-]\d{4}/gi,
        /search\/explore\?(\w+)=(.+)?(help|call|connect|contact|touch|give|support|assistance|verify|confirm|claim|please|dial|reach|speak|resolve|discuss|information|details|process|arrange|action)(.+)(\d{1,2}[\s.-])?\(?\d{3}\)?[\s.-]\d{3,4}[\s.-]\d{4}/gi,
        /search\/\?(\w+)=(.+)?(help|call|connect|contact|touch|give|support|assistance|verify|confirm|claim|please|dial|reach|speak|resolve|discuss|information|details|process|arrange|action)(.+)(\d{1,2}[\s.-])?\(?\d{3}\)?[\s.-]\d{3,4}[\s.-]\d{4}/gi,
    ];
    tabUrl = tabUrl.replace(/\%../g, " ");
    for (const searchHijacking of searchHijackingList) {
        if (searchHijacking.test(tabUrl)) {
            return true;
        }
    }
    return false;
}

async function isExcluded() {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage(
            {
                type: "isExcluded",
                parameters: {type: "hijack", url: window.location.href}
            },
            (response) => {
                if (response && !response.excluded) {
                    resolve(false);
                } else {
                    resolve(true);
                }
            }
        );
    });
};

export async function onSearchHijackingDOMContentLoaded () {
    const excluded = await isExcluded();
    if (excluded) {
        return;
    }
    if (isKnownSearchHijacking(window.location.href)) {
        console.debug("SCHJK: Search Hijacking detected. Showing Search Hijacking notification.");
        await displaySearchHijackingNotification(() => {
            console.debug("SCHJK: Search Hijacking notification shown.");
        });
    }
}
