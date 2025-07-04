import {
  FLAG_ENABLE_BLOCK_EASYLIST_ADS,
  MSG_GET_EASYLIST_SELECTORS,
  MSG_LOAD_INLINE_SCRIPT as MSG_EXECUTE_INLINE_SCRIPT,
  MSG_QUERY_FEATURE_FLAG,
  MSG_RECORD_CONTENT_AD,
  MSG_TAB_INFO_GET,
  MSG_TAB_ID_GET,
  MSG_RECORD_EASYLIST_AD,
  FLAG_ENABLE_BLOCK_YOUTUBE_CUSTOM_ADS,
  MSG_QUERY_EASYLIST,
  CSS_DISPLAY_NONE,
  GDPR_REMOVAL_FLAG,
  CSS_DISPLAY_VISUAL_DEBUGGING_EL_SPECIFIC,
  CSS_DISPLAY_VISUAL_DEBUGGING_EL_GENERIC,
  EASYLIST_AD_BLOCK,
  EASYLIST_PRIVACY_BLOCK,
  MSG_RECORD_EASYLIST_PRIVACY,
} from "@/app/scripts/app-consts.js";
import { chrome } from "@/utils/polyfill";
import type { EasyListElement, EasyListItems } from "@/content-scripts/types/easyListElements";
import { SelectorParser } from "@/content-scripts/heuristics-db/selector-parser";
import { getElementsByRule } from "@/content-scripts/heuristics-db/content-heuristics";
import { vi } from "@faker-js/faker";

//@ts-ignore
if (ENVIRONMENT === "development" && typeof window !== "undefined") {
  window.useLogging = true;
}

interface Tab extends chrome.tabs.Tab {}

export const getTabInfo = (): Promise<Tab> => {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: MSG_TAB_INFO_GET }, (resp: Tab) => {
      if (!resp) {
        reject(new Error("Error obtaining tab info."));
      } else {
        resolve(resp);
      }
    });
  });
};

export function getCurrentTabId() {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type: MSG_TAB_ID_GET }, (resp) => {
      // {tabId: number}
      if (!resp) {
        reject(new Error("Error getting tab info"));
      } else {
        resolve(resp); // {tabId: number}
      }
    });
  });
}

export const recordBlockedAd = (tab: Tab): void => {
  try {
    // record the ad and then update the badge count
    chrome.runtime.sendMessage({
      type: MSG_RECORD_CONTENT_AD,
      tabId: tab.id,
      tabUrl: tab.url,
    });
  } catch (err) {
    console.error("RBAD: Error occurred while recording blocked ad. " + err);
  }
};

export const recordBlockedEasylistAd = (tab: Tab, msg: string): void => {
  try {
    // record the ad and then update the badge count
    chrome.runtime.sendMessage({
      type: msg,
      tabId: tab.id,
      tabUrl: tab.url,
    });
  } catch (err) {
    console.error("RBAD: Error occurred while recording blocked ad. " + err);
  }
};

export const isHidden = (element: HTMLElement): boolean => {
  return element?.style?.display.trim() === "none";
};

export const isEasyListEnabled = (): Promise<boolean> => {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        type: MSG_QUERY_FEATURE_FLAG,
        payload: { feature: FLAG_ENABLE_BLOCK_EASYLIST_ADS },
      },
      (response) => {
        if (!response) {
          reject(new Error("Error getting Easylist info"));
        } else {
          resolve(response.isEnabled);
        }
      }
    );
  });
};

export function isYoutubeCustomBlockingEnabled() {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        type: MSG_QUERY_FEATURE_FLAG,
        payload: { feature: FLAG_ENABLE_BLOCK_YOUTUBE_CUSTOM_ADS },
      },
      (response) => {
        if (!response) {
          reject(new Error("Error getting custom Youtube blocking info"));
        } else {
          resolve(response.isEnabled);
        }
      }
    );
  });
}

export const executeJavascript = (code: string): Promise<boolean> => {
  return new Promise((resolve) => {
    getCurrentTabId()
      .then(({ tabId }: any) => {
        chrome.runtime.sendMessage(
          {
            type: MSG_EXECUTE_INLINE_SCRIPT,
            tabId,
            source: code,
          },
          (response) => {
            if (response) {
              resolve(response);
            }
          }
        );
      })
      .catch((err) => {
        console.error(err);
      });
  });
};

export function downloadEasylistSelectors(
  tabInfo: Tab
): Promise<EasyListElement> {
  return new Promise((resolve, _reject) => {
    chrome.runtime.sendMessage(
      {
        type: MSG_GET_EASYLIST_SELECTORS,
        parameters: {
          type: "hide",
          domain: window.location.hostname,
          url: window.location.href,
          tabId: (tabInfo as any).tabId,
        },
      },
      (response: EasyListElement) => {
        resolve(response);
      }
    );
  });
}

function queryEasylistElements(tabInfo: Tab, url: string, type: string) {
  return new Promise((resolve, _reject) => {
    chrome.runtime.sendMessage(
      {
        type: MSG_QUERY_EASYLIST,
        parameters: {
          type,
          domain: window.location.hostname,
          url,
          tabId: (tabInfo as any).tabId,
        },
      },
      (response) => {
        // { what: "keep" } | { what: "remove" }
        resolve(response);
      }
    );
  });
}

export function checkIfEasylistApplicable(
  tabInfo: Tab,
  easylistItems: EasyListItems,
  easylistPrivacyItems: EasyListItems,
  visualDebugging = false
) {
  try {
    removeEasyListSelectors(tabInfo, easylistItems, MSG_RECORD_EASYLIST_AD, visualDebugging);
    removeEasyListSelectors(tabInfo, easylistPrivacyItems, MSG_RECORD_EASYLIST_PRIVACY, visualDebugging);
  } catch (error) {
    console.log("Error removing selectors", error);
  }
}

export function checkElements(tabInfo: Tab) {
  let elements: NodeListOf<HTMLScriptElement> =
    document.querySelectorAll("script");
  for (const element of Array.from(elements)) {
    queryEasylistElements(
      tabInfo,
      element.src,
      element.tagName.toLowerCase()
    ).then((response: any) => {
      if (response && response.what == "remove") {
        window.useLogging &&
          console.log("Removing script element: " + element.src);
        element.remove();
        recordBlockedEasylistAd(tabInfo, MSG_RECORD_EASYLIST_AD);
      }
    });
  }
}

export function monitorAds(tabInfo: Tab, { shouldCheckAds, easylistItems, easylistPrivacyItems, visualDebugging }) {
  setInterval(() => {
    if (shouldCheckAds) {
      checkIfEasylistApplicable(tabInfo, easylistItems as EasyListItems, easylistPrivacyItems as EasyListItems, visualDebugging);
      shouldCheckAds = false;
    }
  }, 250);
}

function markGDPRConsentAsRemoved() {
    try {
        localStorage.setItem(GDPR_REMOVAL_FLAG, 'true');
    } catch (e) {
        window.useLogging && console.debug("Error setting GDPR removal flag: ", e);
    }
}

function isGDPRConsentRemoved(): boolean {
    try {
        let isRemoved = localStorage.getItem(GDPR_REMOVAL_FLAG);
        return isRemoved === "true";
    } catch (e) {
        window.useLogging && console.debug("Error getting GDPR removal flag: ", e);
        return true; // do not insist on removing GDPR consent
    }
}

function removeGDPRConsent(clickables: any[]) {
  if (isGDPRConsentRemoved()) {
    return;
  }
  setTimeout(() => {
    clickables.forEach(function (entry) {
      let element = document.querySelector(entry.item);
      if (element) {
        window.useLogging && console.log("Clickable found: " + element);
        if (entry.action === "hide") {
          element.style.display = "none !important";
        }
        if (entry.action === "click") {
          element.click();
        }
      }
    });
    markGDPRConsentAsRemoved();
  }, 500);
}

/**
 * Hides the specified node by modifying its style properties.
 * @param {HTMLElement} node - The node to hide.
 * @param {boolean} isVisualDebugging - Flag to indicate if visual debugging is enabled.
 * @param {string} cssClass - The CSS class to apply if visual debugging is enabled.
 * @returns {boolean} - Returns true if the node was successfully hidden, false otherwise.
 */
export function hideNode(
  node: Element,
  isVisualDebugging: boolean,
  cssClass: string
): boolean {
  if ((node as any).m_isDeleted) {
    return false;
  }
  window.useLogging &&
    console.debug(
      "Removing element: " + node.tagName + " " + node.id + " " + node.className
    );
  let style = CSS_DISPLAY_NONE;
  if (isVisualDebugging) {
    style = cssClass;
  }
  node.classList.add(style);
  (node as any).m_isDeleted = true;
  return true;
}

export function removeEasyListSelectors(
  tabInfo: Tab,
  easylistItems: EasyListItems,
  message: string,
  visualDebugging = false
) {
  window.useLogging && console.debug("All elements to be removed: ", easylistItems.classes);
  const elementsToRemove = new Set<HTMLElement>();
  const exceptionRules = easylistItems.exception_rules;
  const exceptionElements = exceptionRules.map((s) => {
    return s && s.length > 0 && document.querySelectorAll(s);
  });

  let extended_hide = new Set(easylistItems.extended_hide);

  const ids = new Set(easylistItems.ids);
  const classes = new Set(easylistItems.classes);
  const tags = new Set(easylistItems.tags);
  const selectors = easylistItems.selectors;
  const clickables = easylistItems.clickables;

  const isException = (element: Element) =>
    exceptionElements.some(
      (nodeList) =>
        nodeList &&
        Array.from(nodeList).some(
          (node) =>
            node === element || JSON.stringify(node) === JSON.stringify(element)
        )
    );

  if (extended_hide.size > 0) {
    const parser = new SelectorParser();
    extended_hide.forEach((selector) => {
      try {
        const selectors = parser.parseSelector(selector);
        if (
          !selectors ||
          (Array.isArray(selectors) && selectors.length === 0)
        ) {
          return;
        }
        const elements = getElementsByRule(selectors);
        if (elements.length === 0) return;
        elements.forEach((element) => {
          if (isException(element)) {
            return;
          }
          elementsToRemove.add(element as HTMLElement);
          if ("title" in element) {
            element.title = "Blocked";
          }
        });
      } catch (e) {
        console.error("Error parsing rule: ", e);
      }
    });
  }
  const allElemsToBeRemoved = document.querySelectorAll(
    "*"
  ) as NodeListOf<HTMLElement>;

  Array.from(allElemsToBeRemoved).forEach((node: HTMLElement) => {
    if (isException(node)) {
      return;
    }

    if (node?.id && ids.has(`#${node.id}`)) {
      node.title = `Blocked (id): ${node.id}`;
      elementsToRemove.add(node);
    }
    if (node.tagName && tags.has(node.tagName)) {
      node.title = `Blocked (tag): ${node.tagName}`;
      elementsToRemove.add(node);
    }

    Array(node.classList).forEach((c) => {
      if (classes.has(`.${c}`)) {
        elementsToRemove.add(node);
        node.title = `Blocked (class): ${c}`;
      }
    });
  });

  easylistItems.specific_hide.forEach(function (item) {
    document.querySelectorAll(item).forEach(function (node) {
      if (
        hideNode(
          node,
          visualDebugging,
          CSS_DISPLAY_VISUAL_DEBUGGING_EL_SPECIFIC
        )
      ) {
        (node as any).title = "Blocked (specific): " + item;
        window.useLogging && console.log("Removing specific element: " + item);
      }
    });
  });

  removeGDPRConsent(clickables);

  if (selectors && selectors.length > 0) {
    document.querySelectorAll(selectors.join(",")).forEach(function (node) {
      (node as any).title = "Blocked (selector): ";
      elementsToRemove.add(node as HTMLElement);
    });
  }

  elementsToRemove.forEach(function (node) {
    if (
      hideNode(
        node,
        visualDebugging,
        CSS_DISPLAY_VISUAL_DEBUGGING_EL_GENERIC
      )
    ) {
      recordBlockedEasylistAd(tabInfo, message);
    }
  });
}
