import { translateText } from '@/utils/locales';
import {
    getUngrantedPermissions,
    requestAccessPermissions,
} from '@/app/scripts/ui-utils/ui-utils';
import { PERMISSIONS_CONTROL_CAROUSEL } from '@/app/scripts/app-consts.js';

const nodes: { id: string; msg: string; sub?: string; }[] = [
    { id: "permission-req-page-title", msg: "permissionReqPageTitle" },
    { id: "permission-req-page-header", msg: "permissionReqPage", sub: " Malwarebytes Browser Guard" },
    { id: "permission-req-page-desc", msg: "optionalPermissionReqPageDesc" },
    { id: "permission-req-instruction", msg: "permissionReqInstruction" },
    { id: "permissionReq-instruction-1", msg: "permissionReqInstruction1" },
    { id: "permissionReq-instruction-2", msg: "permissionReqInstruction2" },
    { id: "permissionReq-instruction-3", msg: "permissionReqInstruction3" },
    { id: "text-learn-more", msg: "mv3WebsiteBlockLearnMore" },
    { id: "learn-more-link", msg: "mv3WebsiteBlockLearnMoreLink" },
];

interface Permission {
    title: string;
    description: string;
}

let filteredPermissions: Record<string, Permission> = PERMISSIONS_CONTROL_CAROUSEL;

export const listPermissionsToggles = async () => {

    let permissionsList = ``;

    const ungrantedPermissions: string[] = await getUngrantedPermissions();

    // Filter out permissions that are already granted
    filteredPermissions = Object.fromEntries(
        Object.entries(filteredPermissions).filter(
            ([key]) => ungrantedPermissions.includes(key)
        )
    );

    Object.entries(filteredPermissions).forEach(([key, permission], index) => {
        const permTitle = chrome.i18n.getMessage(permission.title);
        const permDesc = chrome.i18n.getMessage(permission.description);
        permissionsList += `
        <li>
            <h4 class="toggle-title" id="toggle-title-${index + 1}">${permTitle}</h4>
            <div class="toggle-li-container">
                <p class="toggle-desc" id="toggle-desc-${index + 1}">${permDesc}</p>
                <label class="switch checked">
                    <input type="checkbox" id="perm-toggle-${index + 1}" permission="${key}">
                    <span class="slider round"></span>
                </label>
            </div>
            <div class="divider"></div>
        </li>`;

    });

    const permissionListElement = document.getElementById("permission-list");
    if (permissionListElement) {
        permissionListElement.innerHTML = permissionsList;
    }

}

export const onPermToggleChange = (e) => {
    e.preventDefault();
    
    const permission = e.target.getAttribute('permission');

    requestAccessPermissions({ permissions: [permission] }).then((result) => {
        e.target.checked = result;
        if (e.target.checked) {
            const listItem = e.target.closest('li');
            if (listItem) {
                listItem.classList.add('jump'); // jump animation after removing the permission

                listItem.addEventListener('animationend', () => {
                    listItem.remove();
                    filteredPermissions = Object.fromEntries(
                        Object.entries(filteredPermissions).filter(([key]) => permission !== key)
                    );
                    
                    // Check if there are any remaining permissions, if not close the tab
                    if (Object.keys(filteredPermissions).length === 0) {
                        chrome.tabs.getCurrent((tab?: chrome.tabs.Tab ) => { 
                            chrome.tabs.remove(tab?.id as number);
                        });
                    }
                });
            }    
        }
    });
}

export const bindPermsCheckboxes = () => {
    const permsCtrlsToggles = document.querySelectorAll('.toggle-li-container input[type="checkbox"][permission]');
    permsCtrlsToggles.forEach((input) => {
        input.addEventListener('change', onPermToggleChange);
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    translateText(nodes);
    await listPermissionsToggles();
    bindPermsCheckboxes();
});
