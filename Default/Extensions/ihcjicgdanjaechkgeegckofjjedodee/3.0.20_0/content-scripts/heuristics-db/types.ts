export type SelectorObj = {
    selector: string;
    isSilent: boolean;
    isAggressiveMode?: boolean;
    id: number;
  };

  export enum ElementHidingSelectors {
      "#?#"='extended_selectors',
      "##"='basic_selectors',
  }
  export enum Actions {
    CLICK_ON_ELEMENT = "click",
    REMOVE_ELEMENT = "remove",
  }

  export enum RuleType {
    ADSERVER = "adserver",
    SCAM = "scam",
    PHISHING = "phishing",
    ACTION = "action",
  }
  export type DomainRules = {
    [key in ElementHidingSelectors]: SelectorObj[];
  }|{};

  export interface HeuristicRule {
    r: string; // rule
    s?: boolean; // silent flag
    t:RuleType ; // type
    a?: boolean;
    d?: string; // description
    id: number;
  }

  export type HeuristicsRulesParams = {
    isSilent?: boolean; // silent flag
    isAggressiveMode?: boolean;
    id: number;
  };
  
  export type BlockURL = {
    domain: string;
    isSilent: boolean;
    isAggressiveMode: boolean;
    type: RuleType;
    source: string;
    id: number;
  } & HeuristicsRulesParams;

  export interface ProcessedRules {
    adserver: DomainRules;
    whitelist: Record<string, unknown>;
    scam: DomainRules;
    phishing: DomainRules;
    action: unknown[];
    title: string[];
    description: string[];
    cleanName: string;
    version: string;
    name: string;
  }

  export type SelectorType =
    | "plain"
    | "not"
    | "has"
    | "contains"
    | "comments"
    | "xpath"
    | "properties";
  export type ActionSelectorType = "click"| "remove";

  export interface BaseSelector {
    type: SelectorType;
    raw: string;
  }

  export interface BaseActionSelector {
    type: ActionSelectorType;
    raw: string;
  }

  export interface PlainSelector extends BaseSelector {
    type: "plain";
    action?: Actions;
    selector: string;
  }

  export interface NotSelector extends BaseSelector {
    type: "not";
    selectors: Selector[];
  }

  export interface HasSelector extends BaseSelector {
    type: "has";
    selectors: Selector[];
  }

  export interface ContainsSelector extends BaseSelector {
    type: "contains";
    text: string;
  }

  export interface CommentsSelector extends BaseSelector {
    type: "comments";
    text: string;
  }

  export interface XPathSelector extends BaseSelector {
    type: "xpath";
    xpath: string;
  }
  export interface ClickAction extends BaseActionSelector {
    type: "click";
    selector: string;
  }
  export interface RemoveAction extends BaseActionSelector {
    type: "remove";
    selector: string;
  }
  export interface PropertiesSelector extends BaseSelector {
    type: "properties";
    propertyFilter: string;
  }

  export type Selector =
    | PlainSelector
    | NotSelector
    | HasSelector
    | ContainsSelector
    | CommentsSelector
    | XPathSelector
    | PropertiesSelector
    | ClickAction
    | RemoveAction;

  export const COMPLEX_OPERATORS_REGEX = /:([\w-]+|contains|xpath|properties|has|not)\(/i;
  export const ACTION_OPERATORS_REGEX = /^(.*?):(click|remove)\(/i;
