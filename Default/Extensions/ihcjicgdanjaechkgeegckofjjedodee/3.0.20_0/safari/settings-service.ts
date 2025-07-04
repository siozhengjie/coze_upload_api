import {SettingsService} from "@/domain/settings-service";
import {SettingsStore} from "@/domain/stores/settings";
import {SettingKey} from "@/domain/types/settings";
import {chrome} from "@/utils/polyfill";

const MSG_SAFARI_GET_VERSION_INFO = "MSG_SAFARI_GET_VERSION_INFO";

export class SafariSettingsService implements SettingsService {
    private changeListeners: Map<SettingKey, ((newValue: any) => void)[]> = new Map();

    private static instance: SafariSettingsService;

    private constructor() {        
    }

    static getInstance(): SafariSettingsService {
        if (!SafariSettingsService.instance) {
            SafariSettingsService.instance = new SafariSettingsService();
        }
        return SafariSettingsService.instance;
    }

    getSetting(key: SettingKey): Promise<unknown | undefined> {
        return SettingsStore.getInstance().getSetting(key);
    }

    async setSetting(key: SettingKey, value: unknown): Promise<boolean> {
        console.debug("SETT: setSetting", {key, value});
        const ok = await SettingsStore.getInstance().setSetting(key, value);
        if (ok) {
            console.debug("SETT: setSetting: notifying listeners to: ", {key});
            // Don't wait for this to complete
            new Promise((res) => {
                this.notifyChangeListeners(key, value);
                res(undefined);
            });
        }
        return ok;
    }

    getExtensionVersion(): Promise<string> {
        console.debug("GEV: Sending request to safari");
        return new Promise((resolve, reject) => {
            chrome.runtime.sendNativeMessage(
                "com.malwarebytes.browserguard",
                {action: MSG_SAFARI_GET_VERSION_INFO},
                (response) => {
                    if (chrome.runtime.lastError) {
                        console.error("GEV: Received error from safari", {
                            error: chrome.runtime.lastError,
                        });
                        reject(chrome.runtime.lastError);
                        return;
                    }
                    console.debug("GEV: Received response from safari", {
                        response,
                        fitst: response[0],
                    });
                    resolve(response[0].version);
                }
            );
        });
    }

    addOnChangeListener<V>(
        key: SettingKey,
        callback: (newValue: V) => void
    ): void {
        console.debug("SETT: addOnChangeListener", {key, callback});
        if (!this.changeListeners.has(key)) {
            this.changeListeners.set(key, []);
        }
        this.changeListeners.get(key)?.push(callback);
        console.debug("SETT: addOnChangeListener: listeners", {listeners: this.changeListeners});
    }

    removeOnChangeListener<V>(
        key: SettingKey,
        callback: (newValue: V) => void
    ): void {
        if (!this.changeListeners.has(key)) {
            return;
        }
        const listeners = this.changeListeners.get(key);
        const index = listeners?.indexOf(callback);
        if (index !== undefined && index >= 0) {
            listeners?.splice(index, 1);
        }
    }

    private notifyChangeListeners(key: SettingKey, newValue: any) {
        const listeners = this.changeListeners.get(key);
        console.debug("SETT: setSetting: notifying listeners to: ", {
            key,
            listeners,
        });
        listeners?.forEach((callback) => callback(newValue));
    }
}
