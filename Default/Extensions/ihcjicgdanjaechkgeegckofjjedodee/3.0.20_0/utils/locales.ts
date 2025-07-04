import { chrome } from "@/utils/polyfill";

export const uiLanguage = chrome.i18n.getUILanguage().split("-")[0];

/**
 * Finds an element by ID and replaces its text with the appropriate internationalized string
 * @param {Array<{id: String, msg: String, sub: String}>} nodes - `id` corresponds to the dom element's ID | `msg` corresponds to the appropriate translation name in messages.json | `sub` is any substitution text
 * @param {HTMLElement} dom - (optional) the document to find the element in [defaults to `document`]
 * @returns {void}
 */
export const translateText = (
  nodes: Array<{ id: string; msg: string; sub?: string }>,
  dom: Document = document
): void =>
  nodes.forEach(({ id, msg, sub = null }) => {
    const element = dom.getElementById(id);
    element &&
      (element.textContent = chrome.i18n.getMessage(msg, sub || undefined));
  });


/**
 * @param {String} key The key to translate
 * @param {string | undefined} sub The substitution text
 * @returns {String} The translated string
 */
export function translateSimpleText(
  key: string,
  sub: string | undefined = undefined
): string {
  return chrome.i18n.getMessage(key, sub);
}