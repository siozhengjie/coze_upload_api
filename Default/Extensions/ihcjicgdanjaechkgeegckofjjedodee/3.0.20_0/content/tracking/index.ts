import {hideFacebookAds} from "./facebook";
import {hideTwitterAds} from "./twitter";
import {hideYoutubeAds} from "./youtube";
import {hideRedditAds} from "./reddit";
import {hideLinkedInAds} from "./linkedin";
import {blockInstart} from "./instart";
import {blockChromeTopics} from "./topics";

if (document.readyState !== "loading") {
    onDOMContentLoaded();
} else {
    document.addEventListener("DOMContentLoaded", () => {
        onDOMContentLoaded();
    });
}

async function onDOMContentLoaded() {
    console.debug("Ads script loaded");
    const pageUrl = `${window.location.protocol}//${window.location.hostname}`;
    const siteInfo = new URL(window.location.href);
    const host = siteInfo.host;

    if (host.endsWith("facebook.com")) {
        console.debug("Facebook ads detected");
        hideFacebookAds(pageUrl);
    }
    
    if (
        ["x.com", "twitter.com"].some((u) => host === u || host.endsWith(`.${u}`))
    ) {
        hideTwitterAds(pageUrl);
    }
    
    let allowedHosts = ["youtube.com", "reddit.com", "linkedin.com"];
    if (allowedHosts.includes(host)) {
        if (host === "youtube.com") {
            hideYoutubeAds(pageUrl);
        } else if (host === "reddit.com") {
            hideRedditAds(pageUrl);
        } else if (host === "linkedin.com") {
            hideLinkedInAds(pageUrl);
        }
    }

    // block intrusive ads delivered by invasive reverse proxy (Instart Logic)
    if (
        [
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
        ].some((domain) => host.endsWith(domain))
    ) {
        blockInstart();
    }

    blockChromeTopics(pageUrl);
}


