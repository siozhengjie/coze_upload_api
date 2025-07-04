import {SafariSettingsService} from "@/safari/settings-service";
import {SettingKey} from "./types/settings";
import {browserName} from "@/utils/utils.js";

export interface SettingsService {
    getSetting(key: SettingKey): Promise<unknown | undefined>;
    setSetting(key: SettingKey, value: unknown): Promise<boolean>;
    getExtensionVersion(): Promise<string>;
    addOnChangeListener<V>(key: SettingKey, callback: (newValue: V) => void): void;
    removeOnChangeListener<V>(key: SettingKey, callback: (newValue: V) => void): void;
}

export function getSettingsService(): SettingsService {
    if (browserName() === "Safari") {
        return SafariSettingsService.getInstance();
    }
    return SafariSettingsService.getInstance();
}
