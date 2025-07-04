import { getFeatureSettings, onBreachDOMContentLoaded } from '@/content-scripts/content-breach-notification/utils';

export async function startCheck() {
    const settings = await getFeatureSettings();
    if (settings?.featureFlag) {
        console.debug("DFP: Breach notification feature flag is enabled.", settings.featureFlag);
        if (settings.userSetting) {
            // if both feature flag and user setting are enabled, then show the breach notification
            onBreachDOMContentLoaded();
        } else {
            console.debug("DFP: Breach notification user setting is disabled. Skipping breach notification.");
        }
    } else {
        console.debug("DFP: Breach notification feature flag is disabled. Skipping breach notification.");
    }
}

// start the check on
document.addEventListener("DOMContentLoaded", startCheck);