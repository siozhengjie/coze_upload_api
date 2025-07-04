import {
  Actions,
  BlockURL,
  ContainsSelector,
  CommentsSelector,
  DomainRules,
  ElementHidingSelectors,
  HasSelector,
  HeuristicRule,
  HeuristicsRulesParams,
  NotSelector,
  ProcessedRules,
  PropertiesSelector,
  RuleType,
  Selector,
  SelectorObj,
  XPathSelector,
} from "@/content-scripts/heuristics-db/types";
import { SelectorParser } from "@/content-scripts/heuristics-db/selector-parser";

import {
  MSG_GET_HEURISTICS_DATABASE,
  MSG_GET_HEURISTICS_URLS_TO_BLOCK,
  ruleSeparatorRegexInstance,
} from "@/app/scripts/app-consts";
let useLogging = false;

//@ts-ignore
if (ENVIRONMENT == "development" && typeof window !== "undefined") {
  useLogging = true;
}

export const heuristicsElementsToRemove = new Set<Element>();
export const heuristicsUrlsToBlock = new Set<BlockURL>();

export const downloadHeuristicsDB = (): Promise<ProcessedRules | {}> =>
  new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        type: MSG_GET_HEURISTICS_DATABASE,
        parameters: {
          domain: window.location.hostname,
          url: window.location.href,
        }
      },
      resolve
    );
  });

export const sendHeuristicsURLsToBlock = (): Promise<ProcessedRules | string> =>
  new Promise((resolve, reject) => {
    if (heuristicsUrlsToBlock.size > 0) {
      chrome.runtime.sendMessage(
        {
          type: MSG_GET_HEURISTICS_URLS_TO_BLOCK,
          heuristicsUrlsToBlockArray: Array.from(heuristicsUrlsToBlock),
        },
        resolve
      );
    } else {
      resolve("Nothing to block");
    }
  });

export const processHeuristicsRules = async (
  processedRules: ProcessedRules | {},
  currentUrl: string
) => {
  const isEmpty = (o) => !o || Object.keys(o).length === 0;
  const currentDomain = new URL(currentUrl).hostname;
  const parser = new SelectorParser();

  Object.entries(processedRules).forEach(([type, rules]) => {
    if (isEmpty(rules)) return;

    switch (type as RuleType) {
      case RuleType.ADSERVER:
      case RuleType.PHISHING:
      case RuleType.SCAM:
        const isPageBlock = [RuleType.SCAM, RuleType.PHISHING].includes(
          type as RuleType
        );

        Object.entries(rules as DomainRules).forEach(
          ([selectorsType, selectorsByDomain]) => {
            if (
              ![
                ElementHidingSelectors["#?#"],
                ElementHidingSelectors["##"],
              ].includes(selectorsType as ElementHidingSelectors)
            ) {
              useLogging &&
                console.warn(
                  "processHeuristicsRules:Unexpected selectorsType:",
                  selectorsType
                );
              return null;
            }

            let selector, isSilent, isAggressiveMode, id;
            processSelectorsByDomain(selectorsByDomain, currentUrl).forEach(
              (selectorArrays) => {
                selectorArrays.forEach(async (selectors) => {
                  let allSelectorsMatched = true; // a rule can have multiple selectors we block a page only if all selectors are matched
                  for (let i = 0; i < selectors.length; i++) {
                    const aSelector = selectors[i];
                    // destructure the item
                    selector = aSelector.selector;
                    isSilent = aSelector.isSilent;
                    isAggressiveMode = aSelector.isAggressiveMode;
                    id = aSelector.id;

                    try {
                      const parsedSelectors = parser.parseSelector(selector);
                      if (!parsedSelectors) {
                        allSelectorsMatched = false;
                        return;
                      };

                      const elements = getElementsByRule(parsedSelectors);
                      if (elements.length === 0) {
                        allSelectorsMatched = false;
                        return;
                      }

                      if (!isPageBlock) {
                        elements.forEach((element) =>
                          heuristicsElementsToRemove.add(element)
                        );
                      }
                    } catch (error) {
                      useLogging &&
                        console.error("processSelectorsByDomain", error);
                      throw error;
                    }
                  } //
                  if (allSelectorsMatched && isPageBlock) {
                    heuristicsUrlsToBlock.add({
                      domain: currentDomain,
                      isSilent: isSilent || false,
                      isAggressiveMode: isAggressiveMode || false,
                      type: type as RuleType,
                      source: selector,
                      id: id,
                    });
                  }

                });
              }
            );
          }
        );
        break;
      default:
        return;
    }
  });
};

type PatternInput = string | RegExp;

export const checkUrlAgainstCurrentDomain = (
  pattern: PatternInput,
  href: string | undefined
): boolean => {
  try {
    if (!href) return false;
    const urlRegex = new RegExp(pattern, "i");
    return urlRegex.test(href);
  } catch {
    if (typeof pattern === "string" && href) {
      return pattern === "" || pattern === "*" || href.includes(pattern);
    }
    return false;
  }
};

export function processSelectorsByDomain(
  selectorsByDomain: SelectorObj[],
  href: string
): SelectorObj[][][] {
  let parsedSelectorsToReturn: SelectorObj[][][] = [];
  Object.entries(selectorsByDomain).forEach(([domainRegex, selectors]) => {
    const applyForDomain = checkUrlAgainstCurrentDomain(domainRegex, href);
    if (Array.isArray(selectors) && selectors.length > 0 && applyForDomain) {
      parsedSelectorsToReturn.push(selectors);
    }
  });
  return parsedSelectorsToReturn;
}

/**
 * Processes heuristic rules for ads, scams, and phishing
 * @param heuristicsContent Array of heuristic rules to process
 * @returns Processed rules organized by type and domain
 */
export async function processHeuristics(
  heuristicsContent: HeuristicRule[]
): Promise<ProcessedRules> {
  const processedRules: ProcessedRules = {
    adserver: {},
    whitelist: {},
    scam: {},
    phishing: {},
    action: [],
    title: [],
    description: [],
    cleanName: "heuristics",
    version: "3.0.0",
    name: "mbgc.db.heuristics.json.2",
  };

  // Process each rule
  for (const rule of heuristicsContent) {
    if (!isValidHeuristicsRule(rule)) continue;
    const {
      r: ruleContent,
      s: isSilent,
      t: type,
      a: isAggressiveMode,
      id,
    } = rule;
    if (!ruleContent || !type) continue;

    const params: HeuristicsRulesParams = {
      isSilent,
      isAggressiveMode: isAggressiveMode || false,
      id,
    };

    switch (type) {
      case RuleType.ADSERVER:
        processRule(ruleContent, processedRules.adserver);
        break;
      case RuleType.SCAM:
        processRule(ruleContent, processedRules.scam, params);
        break;
      case RuleType.PHISHING:
        processRule(ruleContent, processedRules.phishing, params);
        break;
    }
  }
  return processedRules;
}

type SimpleRule = {
  separator: string;
  selector: string;
};

type RuleComponents = {
  domain: string;
  selectors: SimpleRule[];
};

/*
 * Splits a rule string into its components
 * @param rule - The rule string to split
 * @returns An object containing the domain, separator, and selectors
 * {"id": 5555, "r":"#?#title:contains(Document)#@#h2:contains(bitcoin)", "s":false, "t":"phishing", "a": true}
 */
const splitRule = (rule: string): RuleComponents | null => {
  // split multiple rules by the separator #@#
  const rules = rule.split(/#@#/);
  // acquire rule separator from the first rule only
  let firstRule = true;
  let separator = "";
  let ruleSelector = "";
  let domain = "";
  let result: RuleComponents = {
    domain: "",
    selectors: [],
  };
  for (const rule of rules) {
    if (firstRule) {
      const match = rule.match(ruleSeparatorRegexInstance);
      if (!match) {
        useLogging && console.debug("SR: Error splitRule: ", rule);
        return null;
      }
      if (match) {
        domain = match[1];
        separator = match[2];
        ruleSelector = match[3];
        firstRule = false;
        result = {
          domain,
          selectors: [
            {
              separator,
              selector: ruleSelector,
            },
          ],
        };
      }
    } else {
      ruleSelector = rule;
      result.selectors.push({
        separator,
        selector: ruleSelector,
      });
    }
  }
  return result;
};

/**
 * Process an individual ad rule and add it to the domain rules
 */
function processRule(
  ruleContent: string,
  rules: DomainRules,
  restParams?: HeuristicsRulesParams
): void {
  const dissectedRules: RuleComponents | null = splitRule(ruleContent);

  if (!dissectedRules) {
    useLogging && console.debug("PR: Error splitRule: ", ruleContent);
    return;
  }

  let { domain, selectors } = dissectedRules;
  if (!selectors || selectors.length === 0) {
    useLogging && console.debug("PR: Error rulesArray: ", ruleContent);
    return;
  }

  domain = domain.trim();
  if (domain == "") domain = "*";
  let processedSelectors: SelectorObj[] = [];
  let separatorStr = "";
  for (const item of selectors) {
    separatorStr = ElementHidingSelectors[item.separator];
    rules[separatorStr] = rules[separatorStr] || {};

    // Process domain-specific rules
    // {"id": 5555, "r":"#?#title:contains(Document)#@#h2:contains(bitcoin)", "s":false, "t":"phishing", "a": true}
    rules[separatorStr][domain] = rules[separatorStr][domain] || [];
    let aSelector = item.selector.trim();
    // replace all pipe signs | with [|], since RegExp("Home | My Site") matches "Home" or "My Site" thus giving false positives
    if (aSelector.includes("\\|")) {
      aSelector = aSelector.replace(/\\\|/g, "[|]");
    }
    if (aSelector.includes('\\"')) {
      aSelector = aSelector.replace(/\\\"/g, '"');
    }
    processedSelectors.push({
      selector: aSelector,
      isSilent: restParams?.isSilent || false,
      isAggressiveMode: restParams?.isAggressiveMode || false,
      id: restParams?.id || 0,
    });
  }
  rules[separatorStr][domain].push(processedSelectors);
}

/**
 * Validates if a heuristic rule has the required properties
 */
const isValidHeuristicsRule = (rule: unknown): rule is HeuristicRule => {
  if (!rule || typeof rule !== "object") {
    return false;
  }

  const typedRule = rule as Record<string, unknown>;

  return (
    typeof typedRule.r === "string" &&
    (typeof typedRule.s === "boolean" || typedRule.s === null) &&
    typeof typedRule.t === "string" &&
    isValidRuleType(typedRule.t)
  );
};

// Type guard for rule type
const isValidRuleType = (type: unknown): type is RuleType =>
  typeof type === "string" && ["adserver", "scam", "phishing"].includes(type);

/**
 * Gets DOM elements matching a specific rule set
 * @param rules Array of selector rules to process
 * @returns Array of matching DOM elements
 */
export const getElementsByRule = (rules: Selector[] | null): Element[] => {
  let elements: Element[] = [];
  let isFirstRule = true;

  if (rules == null) return elements;
  for (const rule of rules) {
    if (isFirstRule) {
      elements = processInitialSimpleSelectors(rule);
      isFirstRule = false;
    } else {
      try {
        elements = filterElementsByRule(elements, rule);
      } catch (error) {
        useLogging && console.error("Error filtering elements by rule", error);
      }
    }
    // If no elements match at any point, we can stop processing
    if (elements.length === 0) {
      break;
    }
  }

  return elements;
};

/**
 * Perform the specified action on elements matching the selector
 * @param selector - The CSS selector to match elements
 * @param action - The action to perform on matched elements
 */
const performActionOnElements = (selector: string, action: Actions) => {
  Array.from(document.querySelectorAll(selector)).forEach((element) => {
    switch (action) {
      case Actions.CLICK_ON_ELEMENT:
        if (element instanceof HTMLElement) {
          element.click();
        }
        break;
      case Actions.REMOVE_ELEMENT:
        element.remove();
        break;
    }
  });
};
/**
 * Process initial simple selectors and return matching elements
 * @param rule - The selector rule to process
 * @returns Array of matching DOM elements
 */

const processInitialSimpleSelectors = (rule: Selector): Element[] => {
  switch (rule.type) {
    case "plain":
      if (typeof document !== "undefined") {
        if (rule.action) {
          performActionOnElements(rule.selector, rule.action);
          return [];
        }
        if (rule.selector.startsWith("/") && rule.selector.endsWith("/")) {
          const regex = new RegExp(rule.selector.slice(1, -1), "i");
          return Array.from(document.querySelectorAll("*")).filter((element) =>
            regex.test(element.textContent ?? "")
          );
        }
        let result = [];
        try {
          result = Array.from(document.querySelectorAll(rule.selector));
        } catch (error) {
          useLogging && console.error("Error in querySelectorAll", error);
        }
        return result;
      } else {
        useLogging && console.log("DEBUG:document undefined");
        return [];
      }
    case "contains":
      return [];
    case "xpath":
      return evaluateXPathSelector(rule);
    default:
      useLogging &&
        console.warn(`Unexpected initial selector type: ${rule.type}`);
      return [];
  }
};

/**
 * Filter elements based on a selector rule
 */
const filterElementsByRule = (
  elements: Element[],
  rule: Selector
): Element[] => {
  switch (rule.type) {
    case "plain":
      return elements.filter((element) => element.matches(rule.selector));
    case "contains":
      return filterByContains(elements, rule);
    case "comments":
      return filterByComments(rule);
    case "has":
      return filterByHas(elements, rule);
    case "not":
      return filterByNot(elements, rule);
    case "properties":
      return filterByProperties(elements, rule);
    case "xpath":
      return filterByXPath(elements, rule);
    default:
      useLogging &&
        console.warn(`Unknown selector type: ${(rule as Selector).type}`);
      return elements;
  }
};

/**
 * Filter elements that contain specific text patterns
 * @param elements - Array of DOM elements to filter
 * @param rule - Contains selector rule with text patterns
 * @returns Array of elements that match the text patterns
 */
const filterByContains = (
  elements: Element[],
  rule: ContainsSelector
): Element[] => {
  // Create a single regex pattern that matches any of the text patterns
  const regexPattern =
    rule.text.startsWith("/") && rule.text.endsWith("/")
      ? new RegExp(rule.text.slice(1, -1), "i")
      : new RegExp(`${rule.text}`, "i");
  return elements.filter((element) => {
    const elementText = element.textContent ?? "";
    let normalizedSearchText = elementText.toLowerCase().trim();
    return regexPattern.test(normalizedSearchText);
  });
};

function filterNone() {
  return NodeFilter.FILTER_ACCEPT;
}

function getAllComments(rootElem) {
  let comments: Element[] = [];
  // Fourth argument, which is actually obsolete according to the DOM4 standard, is required in IE 11
  let iterator = document.createNodeIterator(
    rootElem,
    NodeFilter.SHOW_COMMENT,
    filterNone
  );
  let curNode;
  while ((curNode = iterator.nextNode())) {
    comments.push(curNode);
  }
  return comments;
}

const filterByComments = (rule: CommentsSelector): Element[] => {
  let comments = getAllComments(document.documentElement);
  const regexPattern =
    rule.text.startsWith("/") && rule.text.endsWith("/")
      ? new RegExp(rule.text.slice(1, -1), "i")
      : new RegExp(`${rule.text}`, "i");
  return comments.filter((commentElement) => {
    const elementText: string = commentElement.textContent ?? "";
    let normalizedSearchText = elementText.toLowerCase().trim();
    return regexPattern.test(normalizedSearchText);
  });
};

/**
 * Filter elements that have child elements matching selectors
 */
const filterByHas = (elements: Element[], rule: HasSelector): Element[] => {
  return elements.filter((element) => {
    const childElements = getElementsByRule(rule.selectors);
    const hasMatchingChild = childElements.some((child) =>
      element.contains(child)
    );
    if (!hasMatchingChild) return false;
    return hasMatchingChild;
  });
};

/**
 * Filter elements that don't match the given selectors
 */
const filterByNot = (
  matchingElements: Element[],
  rule: NotSelector
): Element[] => {
  const excludedElements = getElementsByRule(rule.selectors);
  return matchingElements.filter(
    (element) => !excludedElements.includes(element)
  );
};

/**
 * Filter elements by computed style properties
 */
const filterByProperties = (
  elements: Element[],
  rule: PropertiesSelector
): Element[] => {
  const cleanedStyle = rule.propertyFilter.trim(); // only trim, dont remove spaces.
  if (cleanedStyle.length === 0) return [];

  const propsKeys = cleanedStyle
    .split(";")
    .map((oneStyle) => oneStyle.split(":")[0].trim());

  const dummyElement = createDummyHTMLElement(cleanedStyle);
  document.body.appendChild(dummyElement);

  elements = elements.filter((element) => {
    if (!(element instanceof HTMLElement)) return false;

    return hasAllStyles(element, dummyElement, propsKeys);
  });

  document.body.removeChild(dummyElement);

  return elements;
};

// Function to create a dummy element with the given styles
function createDummyHTMLElement(styleString: string): HTMLElement {
  const dummyElement = document.createElement("section");
  const forceHide = "display: none !important;";

  // make sure the dummy element is not visible
  dummyElement.style.cssText = styleString + forceHide;

  return dummyElement;
}

// Function to compare computed styles of two elements
function hasAllStyles(
  realElement: HTMLElement,
  dummyElement: HTMLElement,
  properties: string[]
): Boolean {
  // Get computed styles for both elements
  const realComputedStyle = window.getComputedStyle(realElement);
  const dummyComputedStyle = window.getComputedStyle(dummyElement);

  // Iterate through all styles in the dummy element
  for (const property of properties) {
    const dummyValue = dummyComputedStyle.getPropertyValue(property).trim();
    const realValue = realComputedStyle.getPropertyValue(property).trim();

    // If the property in dummy doesn't match real, return false
    if (dummyValue && dummyValue !== realValue) {
      // Mismatch found for property
      return false;
    }
  }

  // If all styles match, return true
  return true;
}

/**
 * Evaluate XPath selector and return matching elements
 */
const evaluateXPathSelector = (rule: XPathSelector): Element[] => {
  try {
    const result = document.evaluate(
      rule.xpath,
      document,
      null,
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
      null
    );

    const elements: Element[] = [];
    for (let i = 0; i < result.snapshotLength; i++) {
      const element = result.snapshotItem(i) as Element;
      if (element) elements.push(element);
    }
    return elements;
  } catch (error) {
    useLogging && console.error("XPath evaluation error:", error);
    return [];
  }
};

/**
 * Filter elements by XPath expression
 */
const filterByXPath = (elements: Element[], rule: XPathSelector): Element[] => {
  const xpathElements = evaluateXPathSelector(rule);
  return elements.filter((element) => xpathElements.includes(element));
};
