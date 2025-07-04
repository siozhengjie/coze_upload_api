import {
  ACTION_OPERATORS_REGEX,
  Selector,
  COMPLEX_OPERATORS_REGEX, Actions,
} from "@/content-scripts/heuristics-db/types";

export class SelectorParser {
  private parseSelectorContent(
    content: string,
    startIndex: number
  ): { text: string; end: number } | null {
    let parens = 1;
    let quote: string | null = null;
    let i = startIndex;

    for (; i < content.length; i++) {
      const c = content[i];

      if (c === "\\") {
        // Skip escaped characters
        i++;
        continue;
      }

      if (c === "(") {
        parens++;
      } else if (c === ")") {
        parens--;
        if (parens === 0) {
          break;
        }
      }
    }

    if (parens > 0) {
      return null;
    }

    return {
      text: content.substring(startIndex, i),
      end: i,
    };
  }

  public parseSelector(selector: string): Selector[] | null {
    if (selector.length === 0) {
      return null;
    }
    // Check if the selector is an action operator
    const matchedAction = ACTION_OPERATORS_REGEX.exec(selector);
    if (matchedAction) {
      return this.parseActionOperator(matchedAction);
    }

    // Check if the selector is a complex operator
    const match = COMPLEX_OPERATORS_REGEX.exec(selector);
    if (!match) {
      return [
        {
          type: "plain",
          selector: selector,
          raw: selector,
        },
      ];
    }

    const selectors: Selector[] = [];
    if (match.index > 0) {
      selectors.push({
        type: "plain",
        selector: selector.substring(0, match.index),
        raw: selector.substring(0, match.index),
      });
    }

    const startIndex = match.index + match[0].length;
    const content = this.parseSelectorContent(selector, startIndex);

    if (!content) {
      throw new SyntaxError(
        `Failed to parse selector "${selector}" due to unmatched parentheses.`
      );
    }

    switch (match[1]) {
      case "properties":
        selectors.push({
          type: "properties",
          propertyFilter: content.text,
          raw: selector,
        });
        break;
      case "has":
        const hasSelectors = this.parseSelector(content.text);
        if (hasSelectors === null) break;
        selectors.push({
          type: "has",
          selectors: hasSelectors,
          raw: selector,
        });
        break;

      case "contains":
        // Validate that :contains() is not used alone
        if (selectors.length === 1 && selectors[0].type === "contains") {
          throw new SyntaxError(
            `Failed to parse selector "${selector}", can't have a lonely :contains().`
          );
        }

        selectors.push({
          type: "contains",
          text: content.text,
          raw: selector,
        });
        break;

      case "comments":
        // Validate that :comments() is not used alone
        if (selectors.length === 1 && selectors[0].type === "comments") {
          throw new SyntaxError(
            `Failed to parse selector "${selector}", can't have a lonely :comments().`
          );
        }

        selectors.push({
          type: "comments",
          text: content.text,
          raw: selector,
        });
        break;

      case "xpath":
        selectors.push({
          type: "xpath",
          xpath: content.text,
          raw: selector,
        });
        break;

      case "not":
        const notSelectors = this.parseSelector(content.text);
        // If all inner selectors are plain, we can use native :not()
        if (
          notSelectors &&
          Array.isArray(notSelectors) &&
          notSelectors.every((s) => s.type === "plain")
        ) {
          selectors.push({
            type: "plain",
            selector: `:not(${content.text})`,
            raw: selector,
          });
        } else if (notSelectors) {
          selectors.push({
            type: "not",
            selectors: notSelectors,
            raw: selector,
          });
        }
        break;

      default:
        throw new SyntaxError(
          `Failed to parse selector "${selector}", invalid pseudo-class :${match[1]}().`
        );
    }

    // Parse the rest of the selector after the special pseudo-class
    const rest = this.parseSelector(selector.substring(content.end + 1));
    if (rest) {
      selectors.push(...(Array.isArray(rest) ? rest : [rest]));
    }
    return selectors;
  }

  private parseActionOperator(matchedAction: RegExpExecArray): Selector[] {
    const action = matchedAction![2];
    const selector = matchedAction![1];
    const raw = matchedAction.input;
    return [
      {
        type: "plain",
        action: action as Actions,
        selector: selector,
        raw,
      },
    ];
  }
}
