<script lang="ts">    
    import ProtectionStatusIcon from "@/ui/svgs/ProtectionStatusIcon.svelte";
    import AddIconPrimary from "@/ui/svgs/AddIconPrimary.svelte";

    import PrimaryButton from "@/ui/components/PrimaryButton.svelte";
    import {push} from "svelte-spa-router";
    import {getExclusionService} from "@/domain/exclusion-service";
    import {EXCLUSION_ADS, EXCLUSION_SCAMS} from "@/domain/types/exclusion";
    import {EXCLUSION_MALWARE} from "@/app/scripts/app-consts";
    import { translateSimpleText } from "@/utils/locales";

    export let currentHost: string | undefined = undefined;
    export let isProtectionActive = false;
    export let isKillswitchActive = false;
    export let onRemoveFromAllowListClicked: () => void;

    function addToAllowListClicked() {
        push("/allow-list?showAddModal=true");
    }
</script>

<div
    class="flex flex-col items-center justify-start px-6 py-6 w-full h-full bg-bgSecondary dark:bg-bgSecondaryDark rounded-2xl"
>
    <div class="mb-4 mx-auto px-4 w-full">
        <h4
            class="text-base font-semibold truncate text-center"
            title={currentHost}
        >
            {currentHost}
        </h4>
    </div>
    <div class="flex flex-col gap-4 items-center mb-6">
        {#if isProtectionActive}
            <ProtectionStatusIcon isPaused={false} />
            <span class="text-sm text-textSecondary dark:text-white font-normal">
                {translateSimpleText("safariProtectionStatusMsg", "active")}
                <!-- Protection is active -->
            </span>
        {:else}
            <ProtectionStatusIcon isPaused={true} />
            <span
                class="text-sm text-textSecondary dark:text-white dark:text-opacity-80 font-normal"
            >
                {translateSimpleText("safariProtectionStatusMsg", "paused")}
                <!-- Protection is paused -->
            </span>
        {/if}
    </div>
    <div class="h-1 border-b border-grayNeutral95 w-full" />
    <div class="flex flex-col gap-4 mt-6 items-center justify-start">
        {#if isProtectionActive}
            <span
                class="text-textPrimary dark:text-white dark:text-opacity-80 font-normal text-sm"
                >
                {translateSimpleText("safariCurrentWebsiteAllowStatusAdd")}
                <!-- Add this website to your Allow List -->
                </span>
            <PrimaryButton
                outlined
                class="gap-2"
                on:click={addToAllowListClicked}
            >
                <AddIconPrimary />
                <span>
                    {translateSimpleText("safariCurrentWebsiteAddToAllowList")}
                    <!-- Add to Allow List -->
                </span>
            </PrimaryButton>
        {:else if !isKillswitchActive}
            <span
                class="text-textPrimary dark:text-white dark:text-opacity-80 font-normal text-sm"
                >
                {translateSimpleText("safariCurrentWebsiteAllowStatusExists")}
                <!-- This website is already in your Allow List -->
            </span>
            <PrimaryButton
                outlined
                class="gap-2"
                on:click={onRemoveFromAllowListClicked}
            >
                <span>
                    {translateSimpleText("safariCurrentWebsiteRemoveFromAllowList")}
                    <!-- Remove from Allow List -->
                </span>
            </PrimaryButton>
        {/if}
    </div>
</div>
