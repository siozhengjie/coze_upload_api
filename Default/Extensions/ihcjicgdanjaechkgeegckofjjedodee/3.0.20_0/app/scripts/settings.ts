import { chrome, indexedDB } from "@/utils/polyfill";

export class Settings {
  private readonly setToStorageHooks: Array<
    (settings: Record<string, any>) => Promise<void>
  > = [];
  [key: string]: any | null;
  enableProtection: boolean | null = true;
  enableProtectionAds: boolean | null = true;
  enableProtectionGtld: boolean | null = false;
  enableProtectionMalware: boolean | null = true;
  enableProtectionScams: boolean | null = true;
  enableNativeMessaging: boolean | null = null;
  enableVerboseLogging: boolean | null = false;
  enableMonthlyNotification: boolean | null = true;
  enableMaliciousNotification: boolean | null = true;
  enableBreachNotification: boolean | null = true;
  enableBlockCountDisplay: boolean | null = true;
  enableBlockYoutubeCustomAds: boolean | null = true;
  enableSkimmerProtection: boolean | null = true;
  enableVisualDebugging: boolean | null = false;
  enablePingTrackerRemover: boolean | null = true;
  cachedDatabases: boolean | null = null;
  idbStorageDatabases: boolean | null = null;
  sendTelemetry: boolean | null = null;

  // Load up all the settings from chrome.storage.local
  constructor() {
    this.settingsGet(null).then((settings) => {
      if (settings === null) {
        return;
      }
      let tmp: string = "SOG: Settings object: ";
      const skeys = Object.keys(settings);
      skeys.map((key) => {
        tmp += "\n    " + key + " is " + JSON.stringify(settings[key]);
      });
      const tkeys = Object.keys(this);
      tkeys.map((key) => {
        tmp += "\n    " + key + " is " + JSON.stringify(this[key]);
      });

      console.log(tmp);
      Object.assign(this, settings);
    });
  }

  addSetToStorageHook(hook: (settings: Record<string, any>) => Promise<void>) {
    this.setToStorageHooks.push(hook);
  }

  update(settings: Record<string, any>) {
    // Object.assign() copies all enumerable properties from the source object (settings)
    // to the target object (this). It only updates properties that exist in the settings
    // parameter and leaves other properties of the class unchanged.
    // Properties in 'this' that don't exist in 'settings' remain untouched.
    Object.assign(this, settings);
  }

  /**
   * Retrieves the value of a setting by its key.
   *
   * This method checks if the specified key exists as a property in the Settings instance.
   * If the key exists, it returns the corresponding value; otherwise, it returns null.
   *
   * @param {string} key - The name of the setting to retrieve
   * @returns {boolean|null} The value of the setting if it exists, or null if it doesn't
   */
  get(key: string): boolean | null {
    if (Object.prototype.hasOwnProperty.call(this, key)) {
      return this[key];
    }
    return null;
  }

  set(key: string, value: any) {
    Object.assign(this, { [key]: value });
  }

  setAll(settings: Record<string, any>) {
    Object.assign(this, settings);
  }

  clearMemory() {
    // Get all property names of this instance
    const propertyNames = Object.getOwnPropertyNames(this);

    // Iterate through all properties
    for (const prop of propertyNames) {
      // Skip methods and private fields (those starting with '_')
      if (typeof this[prop] !== 'function' && !prop.startsWith('_') &&
        prop !== 'setToStorageHooks') { // Preserve the hooks array        

        // delete the property
        delete this[prop];
      }
    }

    // set the fields to null
    this.enableProtection = null;
    this.enableProtectionAds = null;
    this.enableProtectionGtld = null;
    this.enableProtectionMalware = null;
    this.enableProtectionScams = null;
    this.enableNativeMessaging = null;
    this.enableVerboseLogging = null;
    this.enableMonthlyNotification = null;
    this.enableMaliciousNotification = null;
    this.enableBreachNotification = null;
    this.enableBlockCountDisplay = null;
    this.enableBlockYoutubeCustomAds = null;
    this.enableSkimmerProtection = null;
    this.enableVisualDebugging = null;
    this.enablePingTrackerRemover = null;
    this.cachedDatabases = null;
    this.idbStorageDatabases = null;
    this.sendTelemetry = null;
  }

  async clearFromStorage(): Promise<void> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.clear(function () {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve();
        }
      });
    });
  }

  async getFromStorage(
    keys: string | string[] | null
  ): Promise<boolean | { [key: string]: boolean } | null> {
    return this.settingsGet(keys);
  }

  async setToStorage(settings: Record<string, any>): Promise<boolean> {
    Object.assign(this, settings);
    const res = await this.settingsSet(settings);
    if (res) {
      this.setToStorageHooks.forEach(async (hook) => {
        await hook(settings);
      });
    }
    return res;
  }

  private settingsGet(
    keys: string | string[] | null
  ): Promise<boolean | { [key: string]: boolean } | null> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get(keys, (settings) => {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          const returnValue =
            typeof keys === "string" ? settings[keys] : settings;
          if (
            returnValue === undefined &&
            typeof keys === "string" &&
            this[keys] !== undefined
          ) {
            // allow for a default value other than true
            return resolve(this[keys]);
          }
          resolve(returnValue);
        }
      });
    });
  }

  private settingsSet(settings: Record<string, any>): Promise<boolean> {
    return new Promise((resolve, reject) => {
      chrome.storage.local.set(settings, function () {
        if (chrome.runtime.lastError) {
          reject(chrome.runtime.lastError);
        } else {
          resolve(true);
        }
      });
    });
  }
}
