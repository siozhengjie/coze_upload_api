import { browserName, domain, urlDomains, urlHost } from "@/utils/utils";
import { BlockURL, RuleType } from "@/content-scripts/heuristics-db/types";
import { onScam, RecordType } from "@/app/scripts/app";
import { chrome } from "@/utils/polyfill";
import { simpleStorageSet } from "@/utils/storage";
import { ALWAYS_ALLOW } from "@/app/scripts/app-consts";
import { DatabaseManager } from "@/app/scripts/databases";
import { Settings } from "@/app/scripts/settings";
const threatNamePrefix = {
  heuristic: "heuristic_",
};

class HeuristicSecurityScanner {
  private readonly malwarebytes: any; // Replace with proper type if available
  private readonly isSafari: boolean; // Replace with proper type if available
  private readonly databaseManager: DatabaseManager;
  private readonly settings: Settings;

  constructor(
    malwarebytesInstance: any,
    databaseManager: DatabaseManager,
    settings: Settings
  ) {
    this.malwarebytes = malwarebytesInstance;
    this.isSafari = browserName() === "Safari";
    this.databaseManager = databaseManager;
    this.settings = settings;
  }

  /**
   * Determines whether a given domain should be excluded based on the threat type and mode.
   *
   * @param sourceDomain - The domain to check for exclusion.
   * @param isAggressiveMode - A boolean indicating if the aggressive mode is enabled.
   * @param threatType - The type of threat to check against.
   * @returns A boolean indicating whether the domain should be excluded.
   * Return true if the domain should be excluded, false otherwise.
   */
  private async shouldExcludeDomain(sourceDomain: string, isAggressiveMode: boolean, threatType: RuleType): Promise<boolean> {
    const wlScamsManualDb = await this.databaseManager.getDatabaseByName(
      "whitelist_scams_manual",
      this.settings
    );
    const top1mDb = await this.databaseManager.getDatabaseByName(
      "top1m",
      this.settings
    );

    if (threatType === RuleType.SCAM || threatType === RuleType.PHISHING) {
      let whitelisted =
        urlDomains(sourceDomain).some((domain) => ALWAYS_ALLOW[domain]) ||
        this.malwarebytes.isWhitelisted(
          sourceDomain,
          wlScamsManualDb,
          "Scams"
        ) ||
        this.malwarebytes.isWhitelistedScamsByPattern(sourceDomain) ||
        (!isAggressiveMode &&
          this.malwarebytes.isWhitelisted(sourceDomain, top1mDb, "Scams"));

      return whitelisted;
    }
    return false;
  }

  /**
   * Main scan method to detect threats
   */
  public async scanForThreats(
    urlsToBlock: BlockURL[],
    sourceUrl: string,
    tabId: number
  ): Promise<void> {

    if (!sourceUrl || !urlsToBlock || urlsToBlock.length === 0) {
      return;
    }
    
    const sourceDomain = urlHost(sourceUrl);

    await Promise.all(
      urlsToBlock.map(
        async ({ domain, isSilent, type: threatType, isAggressiveMode, source, id }) => {
          const isAdProtectionActive = this.malwarebytes.isProtectionActive(
            "EXCLUSION_ADS",
            sourceUrl,
            tabId
          );
          if (!isAdProtectionActive) {
            return;
          }

          if (!sourceUrl.includes(domain)) return null;

          const shouldExclude = await this.shouldExcludeDomain(sourceDomain, Boolean(isAggressiveMode), threatType);
          if (shouldExclude) {
            return null;
          }

          const subtype = `${threatType}_heuristic`;
          const blockMessage = `BTW: (NETWORK_BLOCK) heuristic ${threatType} domain found on ${sourceDomain}`;

          simpleStorageSet({ lastDBused: null });
          const heuristicsDb = await this.databaseManager.getDatabaseByName("heuristics", this.settings);
          //@ts-ignore
          const action = onScam({
            tabId: tabId,
            tabURL: sourceUrl,
            url: sourceUrl,
            type: threatType,
            subtype,
            rule: `${threatNamePrefix.heuristic}${id}`,
            blockMessage,
            isSilent,
            selectedCheckedDBs:
              threatType === RuleType.SCAM
                ? [heuristicsDb]
                : undefined,
          });
          chrome.tabs.update(tabId, { url: action.redirectUrl });
        }
      )
    );
  }
}

export { HeuristicSecurityScanner };
