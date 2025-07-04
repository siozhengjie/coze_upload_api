import { isValidIP, createBlockUrl, browserName, urlTLD } from '@/utils/utils';
import { chrome } from '@/utils/polyfill';
import { MSG_IS_WHITELISTED_SCAM, THREAT_TYPES, MSG_TAB_ID_GET, MSG_IS_EXCLUDED, MSG_TELEMETRY_PHISHING_TUNNEL } from '@/app/scripts/app-consts';


type ChromeMessageResponse = { detect?: boolean; excluded?: boolean; tabId?: number };

type TabIdResponse = { tabId: number };

const susStrings: string[] = [
    "0nedr1ve",
    "0nedrive",
    "0nedrlve",
    "0utl00k",
    "0utlook",
    "1cloud",
    "1nstagram",
    "1tunes",
    "account-recovery",
    "account-valid",
    "account-verif",
    "ad0be",
    "apple",
    "appleid",
    "appsid",
    "auth",
    "authenticat",
    "authoriz",
    "authsignin",
    "bank",
    "barc1ays",
    "barclays",
    "centurylink",
    "chase",
    "citizensbank",
    "dr0pb0x",
    "dr0pbox",
    "dropb0x",
    "dropbox",
    "ebay",
    "f0rgot",
    "faceb00k",
    "faceb0ok",
    "facebo0k",
    "facebook",
    "findmy",
    "flickr",
    "fortnite",
    "gmaii",
    "gmail",
    "gmali",
    "lmstagram",
    "lnbox",
    "lnstagram",
    "login-micros",
    "loginmicros",
    "loyds",
    "ltunes",
    "m1crosoft",
    "micr0s0ft",
    "micr0soft",
    "micros0ft",
    "microsoft",
    "mlcrosoft",
    "navyfederal",
    "nertflix",
    "netfiix",
    "netfilx",
    "netfix",
    "netfl1x",
    "netfliix",
    "netflix",
    "netfllx",
    "netgear",
    "netlfix",
    "netrflix",
    "off1ce",
    "office365",
    "offlce",
    "onedr1ve",
    "onedrive",
    "onedrlve",
    "outl00k",
    "outlook",
    "p4yment",
    "p4ymnt",
    "paypal",
    "recover-",
    "recovery-account",
    "santander",
    "sberbank",
    "secur",
    "slgnin",
    "usaa",
    "usaa",
    "verizon",
    "wellsfargo",
    "westernunion",
    "whatsapp",
    "xfinity",
    "yah00",
];

const tunnels: string[] = ['ngrok.io', 'trycloudflare.com'];
const tunnelPhishingSilentMode = false;
const isSafari = browserName() === 'Safari';
const signInStrings: string[] = ["log in", "login", "password", "sigin", "sign in"];

const pathname = (path = ""): string => (path.endsWith(".") ? path.slice(0, -1) : path).toLowerCase();

export const onDetection = (type: string, subtype: string): void => {
    chrome.runtime.sendMessage(
        {
            type: "detection",
            parameters: { type, subtype, url: window.location.href },
        },
        (response: ChromeMessageResponse) => {
            if (response.detect) {
                blockDetection(type, subtype);
            }
        }
    );
};

export const blockDetection = (type: string, subtype: string): void => {
    console.debug("PHISH: Removing suspicious iframes");
    document.querySelectorAll("iframe").forEach((element) => {
        element.remove();
    });

    const prevUrl = isSafari ? document.location : null;
    const blockUrl = createBlockUrl(null, window.location.href, type, subtype, null, null, prevUrl);
    window.location.replace(blockUrl);
};

const sleep = (ms: number): Promise<void> => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};

export const phishDetection = (): void => {
    let text: string | undefined;

    if (pathname(window.location.pathname).endsWith("login.php")) {
        text = document.body.innerText?.toLowerCase();
        if (["natwest.com", "card number"].some((s) => text?.includes(s))) {
            console.debug("PHISH: Caught a Phishing page");
            if (isSafari) {
                blockDetection(THREAT_TYPES.SCAM.type, THREAT_TYPES.PHISHING.type);
            } else {
                onDetection(THREAT_TYPES.SCAM.type, THREAT_TYPES.PHISHING.PHISHING_BANKING);
            }
        }
    }

    if (window.location.protocol === "http:" && isValidIP(window.location.hostname)) {
        const fullUrl = window.location.href.toLowerCase();

        if (fullUrl && susStrings.some((s) => fullUrl.includes(s))) {
            text = text || document.body.innerText?.toLowerCase();

            if (text && signInStrings.some((s) => text?.includes(s))) {
                console.debug("PHISH: Caught a Phishing page");
                if (isSafari) {
                    blockDetection(THREAT_TYPES.SCAM.type, THREAT_TYPES.PHISHING.type);
                } else {
                    onDetection(THREAT_TYPES.SCAM.type, THREAT_TYPES.PHISHING.PHISHING_LOGIN);
                }
            }
        }
    }

    if (tunnels.some((t) => urlTLD(window.location.href).includes(t))) {
        text = text || document.body.innerText?.toLowerCase();

        if (text && signInStrings.some((s) => text?.includes(s))) {
            console.debug("PHISH: Caught a Phishing page");
            if (tunnelPhishingSilentMode) {
                chrome.runtime.sendMessage({
                    type: MSG_TELEMETRY_PHISHING_TUNNEL,
                    parameters: { url: window.location.href },
                });
            } else {
                if (isSafari) {
                    blockDetection(THREAT_TYPES.SCAM.type, THREAT_TYPES.PHISHING.type);
                } else {
                    onDetection(THREAT_TYPES.SCAM.type, THREAT_TYPES.PHISHING.PHISHING_LOGIN_VIA_TUNNEL);
                }
            }
        }
    }

    if (window.location.origin) {
        chrome.runtime.sendMessage(
            {
                type: MSG_IS_WHITELISTED_SCAM,
                payload: { domain: window.location.origin },
            },
            (whitelisted: boolean) => {
                if (whitelisted) return;

                if (window.location.protocol === 'http:') {
                    document.querySelectorAll('form').forEach((form) => {
                        if (form.action.includes('login')) {
                            console.log("PHISH: (PAGE_BLOCK) Caught a Phishing page: Post request through an unsecure protocol");
                            isSafari ? blockDetection(THREAT_TYPES.SCAM.type, 'insecure login') : onDetection(THREAT_TYPES.SCAM.type, "insecure login");
                        }
                    });
                }
            }
        );
    }
};

const getTabId = (): Promise<number> => {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ type: MSG_TAB_ID_GET }, (resp: TabIdResponse) => {
            if (!resp || !resp.tabId) {
                reject(new Error("Failed to get Tab ID"));
            } else {
                resolve(resp.tabId);
            }
        });
    });
};

const isLocalFile = window.location.href.startsWith('file://');

if (!isLocalFile) {
    if (isSafari) {
        getTabId().then((tabId) => {
            chrome.runtime.sendMessage(
                {
                    type: MSG_IS_EXCLUDED,
                    parameters: { type: THREAT_TYPES.SCAM.type, domain: window.location.hostname, tabId },
                },
                (response: ChromeMessageResponse) => {
                    if (response && !response.excluded) {
                        sleep(400).then(() => {
                            phishDetection();
                        });
                    }
                }
            );
        });
    } else {
        chrome.runtime.sendMessage(
            {
                type: MSG_IS_EXCLUDED,
                parameters: { type: THREAT_TYPES.SCAM.type, url: window.location.href },
            },
            (response: ChromeMessageResponse) => {
                if (response && !response.excluded) {
                    sleep(400).then(() => {
                        phishDetection();
                    });
                }
            }
        );
    }
} else {
    console.debug('PHISH: Skipping phishing blocking for local file');
}
