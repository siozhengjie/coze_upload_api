import {
    MSG_ADD_ALLOW,
    MSG_ADD_ALLOW_TEMPORARY,
    MSG_REM_ALLOW_SINGLE,
    THREAT_TYPES
} from "@/app/scripts/app-consts.js";
import {getTabId} from "@/content/helpers";
import {
    EXCLUSION_ADS,
    EXCLUSION_MALWARE,
    EXCLUSION_SCAMS,
    ExclusionType,
} from "@/domain/types/exclusion";
import {sendBackgroundMessage} from "@/utils/messaging/messaging";
import {
    AddAllowRequest,
    AddAllowResponse,
    AddAllowTemporaryRequest,
    AddAllowTemporaryResponse,
    RemAllowSingleRequest,
    RemAllowSingleResponse,
} from "@/utils/messaging/types";
import {urlExt, parseParams} from "@/utils/utils.js";
import {chrome} from "@/utils/polyfill";

export function templateParameters() {
    let params = parseParams(window.location.search);
    return params;
}

export function typesAsPlural(type: string) {
    switch (type) {
        case "malware":
        case "ads":
            return type;
        case "scam":
        case "ad":
            return `${type}s`;
        default:
            return type;
    }
}

export function redirect(url: string, params: Record<any, any>) {
    const pageExtension = urlExt(url);
    const redirectionPage =
        !!pageExtension && !!params.referrer
            ? `http://${params.referrer.split(/^https?:\/\//)[1]}`
            : `http://${params.url.split(/^https?:\/\//)[1]}`;
    console.debug(
        "Add exclusions was successful. Will redirect to: ",
        redirectionPage
    );
    // NOTE: http is forced because Windows Chrome has a bug where it can pass down
    //       https when that is not the case. Atttempting to navigate to https when there is no https with JS breaks.
    window.location.href = redirectionPage;
}

export function getExclusionConst(type: string, params: any): ExclusionType {
    switch (type) {
        case "malware":
            return EXCLUSION_MALWARE;
        case "scam":
            return EXCLUSION_SCAMS;
        case "ad":
        case "ads":
            return EXCLUSION_ADS;
        default:            
            console.error(
                "The block page exclusion checkbox has not handled '" +
                    params.type +
                    "'"
            );
            throw new Error("Invalid type passed to getExclusionConst");
    }
}

export async function updateAllowListViaMessage(
    params: any,
    exclusionConst: ExclusionType,
    continueAlways: boolean
) {
    if (exclusionConst) {
        let toAllow =
            ["full-url-malware", "malware-pattern"].includes(params.subtype) ||
            params.rules === "specific"
                ? params.url
                : params.host;
        if (continueAlways) {
            //EXCLUDE FROM SCANS
            console.debug(
                "Checkbox switched on - requesting allow for " + exclusionConst
            );
            const resp = await sendBackgroundMessage<
                AddAllowRequest,
                AddAllowResponse
            >({
                type: MSG_ADD_ALLOW,
                payload: {domain: toAllow, exclusions: [exclusionConst]},
            });
            if (!resp || resp.error) {
                console.error(resp ? resp.error : "NO RESPONSE!");
            } else {
                redirect(params.url, params);
            }
        } else {
            //INCLUDE IN SCANS - IT MAY BE POSSIBLE TO GET HERE BY CLICKING QUICKLY BEFORE REDIRECT
            console.debug(
                "Checkbox switched off - requesting block for " + exclusionConst
            );

            const resp = await sendBackgroundMessage<
                RemAllowSingleRequest,
                RemAllowSingleResponse
            >({
                type: MSG_REM_ALLOW_SINGLE,
                payload: {domain: toAllow, exclusions: [exclusionConst]},
            });
            if (!resp || resp.error) {
                console.error(resp ? resp.error : "NO RESPONSE!");
            }

            console.debug("Remove exclusions was successful");
        }
    }
}

export async function excludeTemporary(
    exclusionConst: ExclusionType,
    params: any,
    continueAlways: boolean
) {
    if (continueAlways) {
        //DO nothing if checkbox is checked, assume the exclusion was already handled
        //window.location = params.url;
    } else {
        const tabId = await getTabId();
        const response = await sendBackgroundMessage<
            AddAllowTemporaryRequest,
            AddAllowTemporaryResponse
        >({
            type: MSG_ADD_ALLOW_TEMPORARY,
            payload: {
                domain: params.url || params.host,
                tabId: tabId as number,
            },
        });
        if (response.error) {
            console.error(response.error);
            return;
        }

        console.debug("Add exclusions was successful");
        redirect(params.url, params);
    }
}

export function getExplanationText(params: any) {
    switch (params.subtype) {
        case "adware":
            return chrome.i18n.getMessage("blockExplainAdware");
        case "compromised":
            return chrome.i18n.getMessage("blockExplainCompromised");
        case "exploit":
            return chrome.i18n.getMessage("blockExplainExploit");
        case "fraud":
            return chrome.i18n.getMessage("blockExplainFradulent");
        case "hijack":
            return chrome.i18n.getMessage("blockExplainHijack");
        case "malvertising":
            return chrome.i18n.getMessage("blockExplainMalvertising");
        case "malware":
            return chrome.i18n.getMessage("blockExplainMalware");
        case "pharma":
            return chrome.i18n.getMessage("blockExplainPharma");
        case "phishing":
        case "phishingSuspiciousDesciption":
        case "phishingSuspiciousTitle":
            return chrome.i18n.getMessage("blockExplainPhishing");
        case "ransomware":
            return chrome.i18n.getMessage("blockExplainRansomware");
        case "reputation":
            return chrome.i18n.getMessage("blockExplainReputation");
        case "riskware":
            return chrome.i18n.getMessage("blockExplainRiskware");
        case "scam":
            return chrome.i18n.getMessage("blockExplainScam");
        case "spam":
            return chrome.i18n.getMessage("blockExplainSpam");
        case "spyware":
            return chrome.i18n.getMessage("blockExplainSpyware");
        case "trojan":
            return chrome.i18n.getMessage("blockExplainTrojan");
        case "worm":
            return chrome.i18n.getMessage("blockExplainWorm");
        default:
            return chrome.i18n.getMessage("blockExplainDefault");
    }
}

export function humanReadableSubType (subtype: string, type = 'unknownType') {
    if (subtype) {
        if (subtype === "full-url-malware") {
            return "malware";
        } else if (subtype === "suspiciousPage") {
            return chrome.i18n.getMessage("humanReadableSubTypeSuspiciousPage");
        } else if (subtype === "suspiciousTLD") {
            return chrome.i18n.getMessage("humanReadableSubTypeSuspiciousTLD");
        } else if (subtype === "riskyPattern") {
            return chrome.i18n.getMessage("humanReadableSubTypeRiskyPattern");
        } else if (subtype === "suspiciousContent") {
            return chrome.i18n.getMessage("humanReadableSubTypeSuspiciousContent");
        } else if (subtype === "malware-pattern") {
            return chrome.i18n.getMessage("humanReadableSubTypeMalwarePattern");
        } else if (subtype === "alertLoop") {
            return chrome.i18n.getMessage("humanReadableSubTypeAlertLoop");
        } else if (subtype === "authRequiredLoop") {
            return chrome.i18n.getMessage("humanReadableSubTypeAuthRequiredLoop");
        } else if (subtype === "createURLLoop") {
            return chrome.i18n.getMessage("humanReadableSubTypeCreateURLLoop");
        } else if (subtype === "extensionInstall") {
            return chrome.i18n.getMessage("humanReadableSubTypeExtensionInstall");
        } else if (subtype === "fullScreenLoop") {
            return chrome.i18n.getMessage("humanReadableSubTypeFullScreenLoop");
        } else if (subtype === "historyLoop") {
            return chrome.i18n.getMessage("humanReadableSubTypeHistoryLoop");
        } else if (subtype === "notificationLoop") {
            return chrome.i18n.getMessage("humanReadableSubTypeNotificationLoop");
        } else if (subtype === "printLoop") {
            return chrome.i18n.getMessage("humanReadableSubTypePrintLoop");
        } else if (subtype === "phishingSuspiciousDesciption") {
            return chrome.i18n.getMessage("humanReadableSubTypePhishingSuspiciousDescription");
        } else if (subtype === "phishingSuspiciousTitle") {
            return chrome.i18n.getMessage("humanReadableSubTypePhishingSuspiciousTitle");
        } else if (subtype.startsWith(THREAT_TYPES.PHISHING.type)) {
            return THREAT_TYPES.PHISHING.type
        } else if (subtype === "compormised") {
            return chrome.i18n.getMessage("humanReadableSubTypeCompromised");
        }
        return subtype;
    } else {
        return type;
    }
};