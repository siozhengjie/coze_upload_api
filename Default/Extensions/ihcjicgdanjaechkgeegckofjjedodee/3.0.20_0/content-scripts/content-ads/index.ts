import {
    getTabInfo,
    isEasyListEnabled,
    checkElements,
    downloadEasylistSelectors,
    checkIfEasylistApplicable,
    recordBlockedEasylistAd,
    monitorAds,
    hideNode,
    getCurrentTabId,
    recordBlockedAd,
    isHidden,
    isYoutubeCustomBlockingEnabled
} from "./utils";
import {
    downloadHeuristicsDB,
    heuristicsElementsToRemove,
    processHeuristicsRules,
    sendHeuristicsURLsToBlock
} from "@/content-scripts/heuristics-db/content-heuristics";
import {
    RESOURCE_CONTENT_STYLE,
    CSS_DISPLAY_VISUAL_DEBUGGING_HE,
    MSG_RECORD_EASYLIST_AD,
    MSG_RECORD_EASYLIST_PRIVACY
} from "@/app/scripts/app-consts.js";
import { injectCSS, injectJsFile, injectJavascript, isMV3 } from "@/utils/utils.js";
import { blockSponsoredAndSuggested } from "@/app/scripts/adblockers/adb-facebook.js";
import { isAdsProtectionActive } from '@/content-scripts/common-utils';
import {
    clickTheSkip,
    removeKnownAds,
    skipToTheEnd,
} from "@/app/scripts/adblockers/adb-youtube.js";
import type { EasyListElement, EasyListItems } from "@/content-scripts/types/easyListElements";
interface Tab extends chrome.tabs.Tab {}

let indexScope = {
    easylistItems: {} as EasyListItems,
    easylistPrivacyItems: {} as EasyListItems,
    visualDebugging: false,
    shouldCheckAds: true,
}
const pageUrl = `${window.location.protocol}//${window.location.hostname}`;

document.addEventListener("DOMContentLoaded", function() {
    getTabInfo().then(async (tabInfo:any) => {
        // if protection is active and feature list contains easylist blocking
        const shouldBlockAds = (
            // tabInfo.tabId is sent by Safari, tabInfo.id is sent by Chrome?
            await isAdsProtectionActive(tabInfo.tabId || tabInfo.id , tabInfo.url)) &&
            (await isEasyListEnabled());

        if (!shouldBlockAds) {
            return;
        }

        injectCSS(RESOURCE_CONTENT_STYLE);

        checkElements(tabInfo);
        if (Object.keys(indexScope.easylistItems).length === 0) {
            const easylist = await downloadEasylistSelectors(tabInfo);
          indexScope.easylistItems = easylist.easylist;
          indexScope.easylistItems.ids = new Set(indexScope.easylistItems.ids);
          indexScope.easylistItems.classes = new Set(indexScope.easylistItems.classes);
          indexScope.easylistItems.tags = new Set(indexScope.easylistItems.tags);
          indexScope.easylistPrivacyItems = easylist.easylistprivacy;
          indexScope.easylistPrivacyItems.ids = new Set(indexScope.easylistPrivacyItems.ids);
          indexScope.easylistPrivacyItems.classes = new Set(indexScope.easylistPrivacyItems.classes);
          indexScope.easylistPrivacyItems.tags = new Set(indexScope.easylistPrivacyItems.tags);
          indexScope.visualDebugging = easylist.visual_debugging;
        }

          const selectors: any = await downloadHeuristicsDB();
          await processHeuristicsRules(selectors.data, tabInfo.url);
          await sendHeuristicsURLsToBlock();

          heuristicsElementsToRemove.forEach(function (node) {
            if (
              hideNode(
                node,
                indexScope.visualDebugging,
                CSS_DISPLAY_VISUAL_DEBUGGING_HE
              )
            ) {
                //TODO change to heuristics
              recordBlockedEasylistAd(tabInfo, MSG_RECORD_EASYLIST_AD);
            }
          });

        checkIfEasylistApplicable(tabInfo, indexScope.easylistItems, indexScope.easylistPrivacyItems, indexScope.visualDebugging);
        document.querySelectorAll("embed,object").forEach((o:any) => {
            if (o.type === "application/x-shockwave-flash") {
                o.remove()
            }
        });

        indexScope.shouldCheckAds = true;
        // create a timer to check the flag
        monitorAds(tabInfo, indexScope);

        // create a mutation observer to check for new elements,
        // if any are added to the DOM set the flag to true
        // timer will handle the rest
        const observer = new MutationObserver((mutations: MutationRecord[]) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node: any) => {
                    if (node && node.tagName && node.tagName.toLowerCase() === "div") {
                        indexScope.shouldCheckAds = true;
                    }
                });
            });
        });
        observer.observe(document, {
            childList: true,
            subtree: true,
        });
    }).catch((err) => {
        console.debug(err);
    });
});

const siteInfo = new URL(window.location.href);
const host = siteInfo.host && siteInfo.host.toLocaleLowerCase();

// hide Facebook ads and clickbait
const facebookUrls = ["www.facebook.com", "facebook.com"];
if (facebookUrls.includes(host)) {
    let lang = "en";

    const adTexts = {
        en: {
            isSponsored: (str) => str.endsWith("ponsored"), //sponsored
            isSuggested: (str) => str.endsWith("uggested for you"), //suggested for you
        },
        es: {
            isSponsored: (str) => str.endsWith("ublicidad"), //publicidad
            isSuggested: (str) => str.endsWith("ugerencia para ti"), //sugerencia para ti
        },
        pt: {
            isSponsored: (str) => str.endsWith("atrocinado"), //patrocinado
            isSuggested: (str) =>
                str.endsWith("ugestões para você") || str.endsWith("ugestões para ti"), //sugestões para você, sugestões para ti
        },
        de: {
            isSponsored: (str) => str.endsWith("esponsert"), //gesponsert
            isSuggested: (str) => str.endsWith("orschläge für dich"), //vorschläge für dich
        },
        fr: {
            isSponsored: (str) =>
                str.endsWith("ponsorisé") || str.endsWith("ommandité"), //sponsorisé, commandité
            isSuggested: (str) => str.endsWith("uggestion pour vous"), //suggestion pour vous
        },
        it: {
            isSponsored: (str) => str.endsWith("ponsorizzato"), //sponsorizzato
            isSuggested: (str) => str.endsWith("ontenuto suggerito per te"), //contenuto suggerito per te
        },
        nl: {
            isSponsored: (str) => str.endsWith("esponsord"), //gesponsord
            isSuggested: (str) => str.endsWith("oorgesteld voor jou"), //voorgesteld voor jou
        },
        pl: {
            isSponsored: (str) => str.endsWith("ponsorowane"), //sponsorowane
            isSuggested: (str) => str.endsWith("roponowana dla ciebie"), //proponowana dla ciebie
        },
        ru: {
            isSponsored: (str) => str.endsWith("еклама"), //реклама
            isSuggested: (str) => str.endsWith("екомендация для вас"), //рекомендация для васs
        },
    };

    const getLang = () => {
        const docLang = document.documentElement.lang;
        const supportedLangs = Object.keys(adTexts);
        if (docLang && supportedLangs.includes(docLang)) {
            return docLang;
        }
        //If we cannot get the language from documentElement, try reading the placeHolder in the search input
        const searchBox: HTMLInputElement | null = document.querySelector("input[type='search']");
        const searchText = (searchBox && searchBox.placeholder) || "";
        switch (searchText) {
            case "Search Facebook":
                return "en";
            case "Buscar en Facebook":
                return "es";
            case "Busca en Facebook":
                return "es";
            case "Pesquisar no Facebook":
                return "pt";
            case "Pesquisa no Facebook":
                return "pt";
            case "Facebook durchsuchen":
                return "de";
            case "Rechercher sur Facebook":
                return "fr";
            case "Cerca su Facebook":
                return "it";
            case "Zoeken op Facebook":
                return "nl";
            case "Szukaj na Facebooku":
                return "pl";
            case "Поиск на Facebook":
                return "ru";
        }
        return "en";
    };

    // clear additional lazy-loaded sponsored posts without having to use a timer.
    // This approach is faster than calling the method every (n) seconds.
    const onDOMContentLoaded = async () => {
        let tab;
        try {
            tab = await getTabInfo();
        } catch (error) {
            console.debug(`FBA: No valid tab found. ${error}`);
            return;
        }

        const shouldBlockAds = await isAdsProtectionActive(tab.id, '');
        if (shouldBlockAds === false) {
            return;
        }
        lang = getLang();
        setTimeout( () => {
            getTabInfo().then((tab) => {
                blockSponsoredAndSuggested(lang, tab);
            });
        }, 400);
    };
    //https://developer.apple.com/forums/thread/651215
    if (document.readyState !== "loading") {
        onDOMContentLoaded();
    } else {
        document.addEventListener("DOMContentLoaded", () => {
            onDOMContentLoaded();
        });
    }
}

if (
    ["x.com", "twitter.com"].some((u) => host === u || host.endsWith(`.${u}`))
) {
    const malwarebytesClearTwitterAds = (tab) => {
        const divs = document.querySelectorAll(
            'main div[data-testid="cellInnerDiv"]'
        ) as NodeListOf<HTMLDivElement>;

        divs.forEach((div) => {
            const spans  = div.querySelectorAll('div[dir="ltr"] span') as NodeListOf<HTMLDivElement>;

            Array.from(spans).some((span: HTMLDivElement) => {
                if (
                    span.querySelector &&
                    !span.querySelector("span") &&
                    span.innerText === "Ad"
                ) {
                    if (!isHidden(div)) {
                        div.style.display = "none";
                        recordBlockedAd(tab);
                    }
                    return true;
                }
            });
        });
    };

    getTabInfo()
        .then(async (tab: any) => {
            const shouldBlockAds = await isAdsProtectionActive(tab.id, pageUrl);
            return {shouldBlockAds, tab};
        })
        .then((params) => {
            const {shouldBlockAds, tab} = params;
            if (shouldBlockAds === false) {
                return;
            }

            malwarebytesClearTwitterAds(tab);
            setInterval(() => malwarebytesClearTwitterAds(tab), 2000);
        })
        .catch((err) => {
            console.debug("XA: Error occurred while hiding X ads. ", err);
        });
}

if (host === "youtube.com" || host.endsWith(".youtube.com")) {
    const afterDOMLoaded = () =>{
        getTabInfo().then(async (tab: any) => {
            const shouldBlockAds = await isAdsProtectionActive(tab.id, pageUrl) &&
            await isYoutubeCustomBlockingEnabled();
            if (shouldBlockAds === false) {
                return;
            }

            setInterval(() => {
                clickTheSkip();
                skipToTheEnd();
            }, 500);
            removeKnownAds();
            setInterval(() => removeKnownAds(), 1000);
        }).catch((err) => {
            console.debug(err);
        });

    }
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", afterDOMLoaded);
    } else {
        afterDOMLoaded();
    }
}

if (host.endsWith("reddit.com")) {
    const clearRedditAds = (tab) => {
        const matches = document.getElementsByClassName("promotedlink") as HTMLCollectionOf<HTMLElement>;
        for (let i = 0; i < Array.from(matches).length; i++) {
            if (matches[i] && !isHidden(matches[i])) {
                matches[i].style.display = "none";
                recordBlockedAd(tab);
            }
        }
    };

    getTabInfo().then(async (tab: any) => {
        const shouldBlockAds = await isAdsProtectionActive(tab.id, pageUrl);
        if (shouldBlockAds === false) {
            return;
        }

        clearRedditAds(tab);
        setInterval(() => clearRedditAds(tab), 2000);
    }).catch((err) => {
        console.debug("RDA: Error occurred while hiding Reddit ads. ", err);
    });
}

if (host === "www.linkedin.com") {
    let tab: Tab;
    let lang = "en";

    const adTexts = {
        en: {
            isPromoted: (text) => text == "promoted",
        },
        es: {
            isPromoted: (text) => text == "promocionado",
        },
        pt: {
            isPromoted: (text) => text == "patrocinado",
        },
        fr: {
            isPromoted: (text) => text == "post sponsorisé",
        },
        it: {
            isPromoted: (text) => text == "post sponsorizzato",
        },
        nl: {
            isPromoted: (text) => text == "gepromoot",
        },
        pl: {
            isPromoted: (text) => text == "treść promowana",
        },
        ru: {
            isPromoted: (text) => text == "продвигается",
        },
    };

    const isPromotedFeedUnit = (feedUnit) => {
        const spans = feedUnit.querySelectorAll(
            'div[data-control-name="actor"] span.t-12.t-black--light'
        );
        const span = spans[spans.length - 1];
        const text = ((span && span.innerText) || "").trim().toLowerCase();
        return adTexts[lang].isPromoted(text);
    };

    const getPostMainDiv = (ele) => {
        let current = ele;
        while (current) {
            const dataId = current.getAttribute("data-id") || "";
            if (current.classList.contains("relative") && dataId.startsWith("urn:")) {
                return current;
            }
            current = current.parentElement;
        }
        return null;
    };

    const checkFeedUnit = (feedUnit) => {
        if (feedUnit.constructor.name !== "HTMLDivElement") {
            return;
        }
        if (isPromotedFeedUnit(feedUnit)) {
            getTabInfo().then((tab) => {
                const mainDiv = getPostMainDiv(feedUnit);
                if (mainDiv && mainDiv.style && !isHidden(mainDiv)) {
                    mainDiv.style.display = "none";
                    recordBlockedAd(tab);
                }
            });
        }
    };

    const observeAndBlockPromotedFeedItems = () => {
        const mainObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === "childList") {
                    mutation.addedNodes.forEach((addedNode) => {
                        checkFeedUnit(addedNode);
                    });
                }
            });
        });

        mainObserver.observe(document.body, {
            childList: true,
            subtree: true,
        });
    };

    const blockInitialPromotedFeedItems = () => {
        const feedUnits = document.querySelectorAll(
            "#main > div:nth-child(3) > div > div"
        ) as NodeListOf<HTMLDivElement>;
        for (let feedUnit of Array.from(feedUnits)) {
            checkFeedUnit(feedUnit);
        }
    };

    const hideSideBanners = () => {
        getTabInfo().then((tab) => {
            const divs = document.body.querySelectorAll(".ad-banner-container") as NodeListOf<HTMLDivElement>;
            for (let div of Array.from(divs)) {
                if (!isHidden(div)) {
                    div.style.display = "none";
                    recordBlockedAd(tab);
                }
            }
        });
    };

    document.addEventListener("DOMContentLoaded", async () => {
        let tab;
        try {
            tab = await getTabInfo();
        } catch (error) {
            console.debug("LIA: No valid tab found. ", error);
            return;
        }
        const shouldBlockAds = await isAdsProtectionActive(tab.id, pageUrl);
        if (shouldBlockAds === false) {
            return;
        }
        lang = document.documentElement.lang || "en";
        if (!Object.keys(adTexts).includes(lang)) {
            lang = "en";
        }
        blockInitialPromotedFeedItems();
        observeAndBlockPromotedFeedItems();
        hideSideBanners();
        setInterval(() => hideSideBanners(), 2000);
    });
}

const instartDomains = [
    "msn.com",
    "cnet.com",
    "gamespot.com",
    "ign.com",
    "slickdeals.net",
    "webmd.com",
    "sfgate.com",
    "chron.com",
    "metacritic.com",
    "pcmag.com",
    "ranker.com",
    "chicagotribune.com",
    "tvguide.com",
    "newsweek.com",
    "nasdaq.com",
    "sporcle.com",
    "medicinenet.com",
    "edmunds.com",
    "everydayhealth.com",
    "sportingnews.com",
    "metrolyrics.com",
    "boston.com",
    "thoughtcatalog.com",
    "emedicinehealth.com",
    "cafemom.com",
    "streetchopperweb.com",
    "seattlepi.com",
];

// block intrusive ads delivered by invasive reverse proxy (Instart Logic)
if (instartDomains.some((domain) => host.endsWith(domain))) {
    const handleNotWhitelisted = (property) => {
        const params = {
            isWhitelisted: false,
            property: property,
        };
        window.postMessage(
            {
                type: "isInstartWhitelistedResponse",
                parameters: JSON.stringify(params),
            },
            `${window.location.protocol}//${window.location.host}`
        );
    };

    const checkIfInstartWhitelisted = (_href, property) => {
        chrome.runtime.sendMessage(
            chrome.runtime.id,
            {
                type: "isInstartWhitelisted",
                parameters: {href: window.location.href, prop: property},
            },
            (response) => {
                if (response && response.isWhitelisted) {
                    console.debug(
                        "INS: " + property + " is whitelisted for " + window.location.href
                    );
                } else {
                    if (chrome.runtime.lastError) {
                        console.error(
                            "INS: Failed with is-whitelisted request for " +
                property +
                ": " +
                chrome.runtime.lastError.message
                        );
                    }
                    handleNotWhitelisted(property);
                }
            }
        );
    };

    window.addEventListener("message", (event) => {
        if (!event.origin) {
            return;
        }
        if (event.origin !== window.location.origin) {
            return;
        }

        const originUrl = new URL(event.origin);
        const eventHost = originUrl.host;
        if (
            event.data.type === "isInstartWhitelisted" &&
            eventHost === window.location.host
        ) {
            const params = JSON.parse(event.data.parameters);
            checkIfInstartWhitelisted(params.href, params.prop);
        }
    });

    const extId = chrome.runtime.id;
    injectJsFile("injection-instart.js", {extId: extId});
}

// block chrome Topics API
// https://malwarebytes.atlassian.net/browse/BG-1266
export const removeBrowsingTopics = () => {
    if (!isMV3()) {
        injectJavascript(
            `if (!!document.browsingTopics) { delete Document.prototype.browsingTopics; }`
        );
    } else {
        injectJsFile('injection-topics.js', null);
    }
}

getCurrentTabId().then(async (tabInfo: any) => {
    const tabId = tabInfo.tabId;

    const shouldBlockAds = await isAdsProtectionActive(tabId, pageUrl);
    if (!!shouldBlockAds === false) {
        return;
    }

    removeBrowsingTopics();

}).catch((err) => {
    console.debug("TAPI: Error occurred while hiding Topics API ads. ", err);
});
