/**
 *
 * This content script acts as a bridge between the page context (main world) and the Chrome extension's background service worker.
 * 
 * Purpose:
 * - Listens for messages from scripts running in the page context (such as those injected with "world": "MAIN").
 * - Forwards these messages to the background service worker using chrome.runtime.sendMessage, enabling access to extension APIs.
 * - Relays responses from the background back to the page context using window.postMessage.
 *
 * Use Case:
 * - Required when a script running in the page context needs to communicate with the extension's background/service worker,
 *   but cannot access chrome.* APIs directly.
 * - Ensures secure and controlled communication between the page and the extension.
 *
 * Usage:
 * - The page script sends a message using window.postMessage.
 * - This bridge script listens for the message, processes it, and forwards it to the background.
 * - When a response is received, the bridge posts it back to the page context.
 */

import {
  MSG_CHECK_DOMAIN_ALLOW_LIST,
} from "@/app/scripts/app-consts.js"
import { checkAllowListByTypeAndDomain } from "./bridges";


window.addEventListener("message", (event: MessageEvent) => {

  // Only accept messages from the same window
  if (event.source !== window) return;

  const msg = event?.data?.type;

  switch (msg) {
    case MSG_CHECK_DOMAIN_ALLOW_LIST:
      checkAllowListByTypeAndDomain(event.data);
      break;
    /**
    case MSG_SOME_OTHER_MESSAGE:
      handleSomeOtherMessage(event.data);
      break;
    */
    default:
      console.debug("Content Script Bridge: Unknown message type, ", msg);
      break;
  }
});
