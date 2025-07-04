import * as Sentry from "@sentry/svelte";
import {chrome} from "@/utils/polyfill";

export function sentryInit(options: Record<string, any> = {}) {
    let params = {
        dsn: "https://f749b5abe8e35b39c871e87bf7c0db6c@o438337.ingest.sentry.io/4506122597433344",
        tracesSampleRate: 0.00025, // 0.05%
        sampleRate: 0.05,
        // Session Replay
        replaysSessionSampleRate: 0.1, // This sets the sample rate at 10%. You may want to change it to 100% while in development and then sample at a lower rate in production.
        replaysOnErrorSampleRate: 0,
        // This variable is set in Webpack itself (see webpack.DefinePlugin)
        environment: "production",
        enabled: true,
        release: chrome.runtime.getManifest().version,
        attachStacktrace: true,
    };
    Object.assign(params, options);

    Sentry.init(params);
    Sentry.getCurrentScope().setLevel("error");
}

export function sentryToggle(enabled: boolean) {
    const client = Sentry.getCurrentHub().getClient();
    if (client) {
        client.getOptions().enabled = enabled;
    }
}