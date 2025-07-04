
export type EasyListItems = {
    ids: string[] | Set<string>;
    classes: string[] | Set<string>;
    tags: string[] | Set<string>;
    selectors: string[];
    exception_rules: string[];
    specific_hide: string[];
    extended_hide: string[];
    clickables: string[];
};

export type EasyListElement = {
    tabId: number;
    easylist: EasyListItems;
    easylistprivacy: EasyListItems;
    visual_debugging: boolean;
};
