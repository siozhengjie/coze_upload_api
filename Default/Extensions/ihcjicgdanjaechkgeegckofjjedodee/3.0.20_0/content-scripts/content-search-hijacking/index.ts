import { getFeatureSettings, onSearchHijackingDOMContentLoaded } from "@/content-scripts/content-search-hijacking/utils";

export async function startCheck() {
    const settings = await getFeatureSettings();
    if (settings?.featureFlag) {
        console.debug("SCHJK: Search Hijacking notification feature flag is enabled.", settings.featureFlag);
        if (settings.userSetting) {
            // if both feature flag and user setting are enabled, then show the Search Hijacking notification
            if (document.readyState === 'loading') {
                // Still loading, safe to listen
                document.addEventListener("DOMContentLoaded", onSearchHijackingDOMContentLoaded);
            } else {
                // DOM already loaded, run immediately
                onSearchHijackingDOMContentLoaded();
            }
        } else {
            console.debug("SCHJK: Search Hijacking notification user setting is disabled. Skipping Search Hijacking notification.");
        }
    } else {
        console.debug("SCHJK: Search Hijacking notification feature flag is disabled. Skipping Search Hijacking notification.");
    }
}

startCheck();