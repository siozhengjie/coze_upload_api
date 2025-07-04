import breaches from "@/db/breaches.json";
import { displayBreachNotification } from "@/content-scripts/content-notifications.js";
import { settingsGetAsync, featureFlagGetAsync } from "@/app/scripts/ui-utils/ui-utils.js";
import { SETTING_BREACH_NOTIFICATION, FLAG_ENABLE_BREACH_NOTIFICATION } from "@/app/scripts/app-consts.js";


export type BreachData = {
    id: number;
    title: string;
    description: string;
    site: string;
    site_description: string;
    num_records: number;
    spycloud_publish_date: string;
    acquisition_date: string;
    assets: any;
    breach_category: string;
    breached_companies: {
        company_name: string;
        industry?: string; // Make industry optional
    }[] | null; // Allow null value for breached_companies
    targeted_industries?: string[]; // Make targeted_industries optional
    short_title: string;
};

export type FeatureSetting = {
    featureFlag: boolean;
    userSetting: boolean;
}

export type NotificationHistory = {
    websiteList: Set<string>;
    lastShowDate: number;
};

export const getShownBreachesList = (): Promise<Set<string>> => {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['breachesShownSites'], (res) => {
            const breachesShownList: string[] = res.breachesShownSites ? Object.keys(res.breachesShownSites) : [];
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(new Set(breachesShownList));
            }
        });
    });
};

export const getBreachLastShow = (): Promise<number> => {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get(['breachLastShow'], (result) => {
            const lastShowDate: number = result.breachLastShow;
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(lastShowDate);
            }
        });
    });
};

export function getFeatureSettings(): Promise<FeatureSetting> {
    return new Promise(async (resolve, reject) => {
        let BreachSettings: FeatureSetting;
        try {
            const featureFlag = await featureFlagGetAsync(FLAG_ENABLE_BREACH_NOTIFICATION);
            const userSetting = await settingsGetAsync(SETTING_BREACH_NOTIFICATION);
            BreachSettings = {
                featureFlag,
                userSetting
            };
            resolve(BreachSettings);
        } catch (error) {
            console.error("Error fetching breach toggle settings:", error);
            reject(error);
        }
    });
}

export async function getNotificationHistory(): Promise<NotificationHistory> {
    const history: NotificationHistory = {
        websiteList: await getShownBreachesList(),
        lastShowDate: await getBreachLastShow()
    };
    return history;
}

export function isDayElapsed(date: number | null): boolean {
    if (!date) return true;
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000; // Milliseconds in a day
    return (now - date) >= oneDay;
}
export async function onBreachDOMContentLoaded () {

    const tabUrl: string = window.location.host.replace(/(http(s)?:\/\/)?(www\.)?/g, '').replace(/\/$/, '');
    // Function to normalize the URL for consistent comparison
    const normalizeUrl = (url: string): string => url.replace(/(http(s)?:\/\/)?(www\.)?/g, '').replace(/\/$/, '').trim();

    if (tabUrl) {

        const breachSearchRes: BreachData | undefined = breaches.find(breach => {
            if (breach.site && breach.site.includes(',')) {
                // Normalize all parts and compare
                return breach.site.split(',').some(item => normalizeUrl(item) === tabUrl);
            } else {
                // Normalize and compare directly
                return normalizeUrl(breach.site || '') === tabUrl;
            }
        });

        if (breachSearchRes) {
            try {
                const notiHistory: NotificationHistory = await getNotificationHistory();

                // is the breach notification already shown for this website?
                const isNotificationShownBefore: boolean = notiHistory.websiteList?.has(breachSearchRes.id.toString()) ? true : false;

                // get the last shown date of the breach notification in general
                const lastShowDate: number | null = notiHistory.lastShowDate;

                if (isDayElapsed(lastShowDate) && !isNotificationShownBefore) {

                    console.log(`DFP: Showing user breach notification for ${tabUrl} (ID: ${breachSearchRes.id})`);
                    displayBreachNotification(breachSearchRes);

                } else {
                    console.log(
                        `DFP: Skipping showing breach notification for ${tabUrl} (ID: ${breachSearchRes.id}) ` +
                        `[reason: already shown in the last 24 hours]`
                    )
                }
            } catch (error) {
                console.error("Error fetching notification history:", error);
            }
        } 
    }
}