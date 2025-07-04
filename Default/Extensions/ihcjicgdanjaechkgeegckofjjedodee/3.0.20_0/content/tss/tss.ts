import {sendBackgroundMessage} from "@/utils/messaging/messaging";
import {
    MSG_DETECTION,
    MSG_SETTINGS_GET,
    MSG_TAB_ID_GET,
} from "@/app/scripts/app-consts.js";
import {
    DetectionRequest,
    DetectionResponse,
    GetSettingRequest,
    GetSettingResponse,
} from "@/utils/messaging/types";
import {createBlockUrl, isSafari} from "../helpers";
import {injectJavascript, urlHost} from "@/utils/utils.js";
import {
    checkoutRegex,
    latestTssBodyPatterns,
    latestTssTitlePatterns,
} from "@/utils/patterns.js";
import {SETTING_SKIMMER_PROTECTION} from "@/domain/types/settings";
import {
    isCheckoutSkimmer,
    isExcluded,
    isRepeated,
    isSusAudioPlayer,
    isTrojanScam,
} from "./functions";
import {EXCLUSION_SCAMS} from "@/domain/types/exclusion";
import { SetTss } from '../../app/scripts/tss-setup.js';

var detected = false;
var excluded = false;
var tabId;
var nonce =
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15);
let mbtssUrl = window.location.href;
let lastFullScreenData = {};

function isSuspiciousPage() {
    return isSusAudioPlayer() || isTrojanScam();
}

function onSuspiciousPage() {
    console.debug("TSS: Caught a suspicious page");
    onDetection("scam", "suspiciousPage");
}

async function onDetection(type, subtype) {
    if (!detected && !excluded) {
        const resp = await sendBackgroundMessage<
            DetectionRequest,
            DetectionResponse
        >({
            type: MSG_DETECTION,
            payload: {type: EXCLUSION_SCAMS},
        });
        console.debug(`TSS: Received onDetection message response`, {resp});
        if (resp.payload!.detect) {
            onDetectionImpl(type, subtype);
        } else {
            onExclusion("detection");
        }
    }
}

async function onDetectionImpl(type, subtype) {
    if (isSafari) {
        const isExcl = await isExcluded(urlHost(mbtssUrl), tabId);
        if (isExcl) {
            return;
        }
    }

    console.debug("TSS: Removing suspicious iframes");
    detected = true; // suppress "are you sure you want to leave this page?" popups
    // delete iframes so they can't show the popups either
    document.querySelectorAll("iframe").forEach((element) => {
        element.remove();
    });

    const prevUrl = isSafari ? document.referrer : null;
    const blockUrl = createBlockUrl(
        null,
        mbtssUrl,
        type,
        subtype,
        null,
        null,
        prevUrl
    );
    window.location.replace(blockUrl);
}

function onExclusion(trig) {
    excluded = true;
    if (trig != "send-mesage") {
        window.postMessage({type: "exclude", nonce: nonce}, "*");
    }
}

function onFullScreenChange() {
    console.debug("TSS: Caught suspicious full screen spamming");
    // detect if >= 10 repeated full screen changes within 10 seconds
    console.debug(
        `TSS: Checking if repeated ${10} times for interval ${10000} against data: `,
        lastFullScreenData
    );
    if (isRepeated(lastFullScreenData, 10000, 10)) {
        onDetection("scam", "fullScreenLoop");
    }
}

function onAuthRequired() {
    console.debug(
        "TSS: Caught suspicious auth required - investigating for tech support scam"
    );
    // detect if page looks like a tech support scam
    if (isSuspiciousPage()) {
        onDetection("scam", "authRequiredLoop");
    }
}

function initScriptListener() {
    window.addEventListener(
        "message",
        (event) => {
            if (
                event.source === window &&
                event.data.nonce === nonce &&
                event.data.type === "scam"
            ) {
                onDetection(event.data.type, event.data.subtype);
            }
        },
        false
    );
}

// Skimmer protection bypasses the allowlist due to its prevalence on popular sites
// https://malwarebytes.atlassian.net/browse/BG-1337
function injectSkimmerProtection() {
    console.debug("TSS: Init skimmer protection");
    injectJavascript(`
        setTimeout(() => (devtools = true), 1000);
        window.Firebug = {chrome: {isInitialized: true}};
    `);
}

function setup() {
    initScriptListener();
    window.addEventListener(
        "beforeunload",
        (event) => {
            //TODO: We need to detect and prevent: Navigated to https://www.msn.com/g00/en-us?i10c.ua=1&i10c.encReferrer=&i10c.dv=15
            event.stopImmediatePropagation();
        },
        false
    );

    document.addEventListener("fullscreenchange", onFullScreenChange, false);
    document.addEventListener(
        "webkitfullscreenchange",
        onFullScreenChange,
        false
    );
    document.addEventListener("mozfullscreenchange", onFullScreenChange, false);
    chrome.runtime.onMessage.addListener((message, ignored, ignore) => {
        if (message.type === "authRequired") {
            onAuthRequired();
        }
    });

    injectJavascript(`
        (function() {
            const TssFunc = ${SetTss.toString()};
            TssFunc("${nonce}", ${isRepeated.toString()}, "tss.ts")
        })();
    `);

    if (isCheckoutSkimmer()) {
        console.debug("TSS: Caught unsafe checkout");
        onDetection("scam", "suspiciousPage");
    }

    const detectSuspiciousPage = () => {
        if (latestTssTitlePatterns.test(document.head.outerHTML)) {
            console.debug(
                "TSS: Page blocked due to malicious patterns in the head content."
            );
            return onSuspiciousPage();
        }
        const hasSuspiciousPattern = latestTssBodyPatterns.some((element) =>
            document.body.outerHTML.includes(element)
        );
        if (hasSuspiciousPattern) {
            return onSuspiciousPage();
        }
    };

    if (document.readyState !== "loading") {
        detectSuspiciousPage();
    } else {
        document.addEventListener("DOMContentLoaded", function () {
            detectSuspiciousPage();
        });
    }

    setTimeout(() => {
        if (isSuspiciousPage()) {
            onSuspiciousPage();
        }
    }, 1000);
}

export function getTabId() {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({type: MSG_TAB_ID_GET}, function (response) {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError.message);
            } else {
                resolve(response.payload.tabId);
            }
        });
    });
}

if (document.readyState !== "loading") {
    onDOMContentLoaded();
} else {
    document.addEventListener("DOMContentLoaded", () => {
        onDOMContentLoaded();
    });
}

async function onDOMContentLoaded() {
    console.debug("TSS: Script loaded");
    console.debug("TSS: Init");
    getTabId().then(async (id) => {
        console.debug("TSS: Tab id", {id});
        tabId = id;
        const excluded = await isExcluded(urlHost(mbtssUrl), tabId);
        if (excluded) {
            console.debug("TSS: Excluded");
            onExclusion("send-message");
        } else {
            console.debug("TSS: Setup");
            setup();
        }
    });

    if (checkoutRegex.test(window.location.toString())) {
        sendBackgroundMessage<GetSettingRequest, GetSettingResponse>({
            type: MSG_SETTINGS_GET,
            payload: {key: SETTING_SKIMMER_PROTECTION},
        })
            .then((resp) => {
                console.debug("TSS_SKIMMER: skimmer protection response", {resp});
                if (resp.payload && resp.payload.value === true) {
                    injectSkimmerProtection();
                } else {
                    console.debug("TSS_SKIMMER: skimmer protection not enabled", {
                        resp,
                    });
                }
            })
            .catch((err) => {
                console.error("TSS_SKIMMER: skimmer protection error", {err});
            });
    }
}
