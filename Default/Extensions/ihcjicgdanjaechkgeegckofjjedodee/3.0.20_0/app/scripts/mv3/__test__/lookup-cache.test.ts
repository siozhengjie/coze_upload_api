import { StaticRuleLookupCache } from "../lookup-cache";

describe("StaticRuleLookupCache", () => {
    let cache;
    const rules = [
        { id: 1, condition: { urlFilter: "||example.com^" } },
        { id: 2, condition: { urlFilter: "||test.com^" } },
        { id: 3, condition: { urlFilter: "^sample.org^" } }
    ];

    beforeEach(() => {
        cache = new StaticRuleLookupCache("TestCache", rules);
    });

    test("should initialize correctly", () => {
        expect(cache.name).toBe("TestCache");
        expect(cache.idToRules.size).toBe(3);
        expect(cache.domainToIds.size).toBe(3);
    });

    test("should search for an existing domain and return the rule", () => {
        const result = cache.searchForDomain("example.com");
        expect(result).toEqual({ ruleId: 1, rule: rules[0] });
    });

    test("should return null for a non-existing domain", () => {
        const result = cache.searchForDomain("nonexistent.com");
        expect(result).toBeNull();
    });

    test("should correctly strip leading || or ^ and trailing ^ from urlFilter", () => {
        expect(cache.domainToIds.has("example.com")).toBe(true);
        expect(cache.domainToIds.has("test.com")).toBe(true);
        expect(cache.domainToIds.has("sample.org")).toBe(true);
    });
});
