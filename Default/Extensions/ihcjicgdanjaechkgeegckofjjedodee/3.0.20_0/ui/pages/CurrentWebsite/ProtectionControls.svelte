<script lang="ts">
    import Switch from "@/ui/components/Switch.svelte";
    import { translateSimpleText } from "@/utils/locales";

    export let isAdsKillswitchActive: boolean;
    export let isMalwareKillswitchActive: boolean;
    export let isScamsKillswitchActive: boolean;
    export let currentUrlIsValid = false;
    export let adsProtectionEnabled: boolean;
    export let malwareProtectionEnabled: boolean;
    export let scamProtectionEnabled: boolean;
    export let onAdsProtectionToggled: (enabled: boolean) => void;
    export let onMalwareProtectionToggled: (enabled: boolean) => void;
    export let onScamsProtectionToggled: (enabled: boolean) => void;



</script>

<div class="flex flex-col w-full items-start justify-start pt-6 dark:text-white dark:text-opacity-80">
    {#if currentUrlIsValid}
        <h5 class="text-textPrimary font-semibold text-sm pb-4 dark:text-white dark:text-opacity-80">
            {translateSimpleText("currentWebsiteProtectionHeader")}
            <!-- Protection for this website: -->
        </h5>

        <div class="flex flex-row w-full justify-between items-center py-4">
            <span class="text-sm font-normal text-textPrimary dark:text-white dark:text-opacity-80"
                >Ads / Trackers</span
            >
            <Switch
                checked={isAdsKillswitchActive == false && adsProtectionEnabled}
                disabled={isAdsKillswitchActive}
                onChanged={onAdsProtectionToggled}
            />
        </div>
        <div class="flex flex-row w-full justify-between items-center py-4">
            <span class="text-sm font-normal text-textPrimary dark:text-white dark:text-opacity-80">Malware</span>
            <Switch
                checked={isMalwareKillswitchActive == false && malwareProtectionEnabled}
                disabled={isMalwareKillswitchActive}
                onChanged={onMalwareProtectionToggled}
            />
        </div>
        <div class="flex flex-row w-full justify-between items-center py-4">
            <span class="text-sm font-normal text-textPrimary dark:text-white dark:text-opacity-80">Scams</span>
            <Switch
                checked={isScamsKillswitchActive == false && scamProtectionEnabled}
                disabled={isScamsKillswitchActive}
                onChanged={onScamsProtectionToggled}
            />
        </div>
    {:else}
        <p class="text-left text-sm font-normal">
            {translateSimpleText("currentWebsiteSystemPage")}
            <!-- System pages are addresses which are part of the browser or an
            extension, we do not block content on these pages. -->
        </p>
    {/if}
</div>
