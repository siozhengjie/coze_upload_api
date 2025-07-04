<script lang="ts">
    import {link, location} from "svelte-spa-router";
    import ArrowLeftIcon from "@/ui/svgs/ArrowLeftIcon.svelte";
    import { translateSimpleText } from "@/utils/locales";

    let routeHeaders = {
        "/support": translateSimpleText("supportNavItem"),
        "/settings": translateSimpleText("settingsNavItem"),
    };
</script>

<div
    class="relative w-full flex flex-row items-center justify-center py-2 text-sm border-b-2 border-grayNeutral95 dark:border-grayNeutral40 text-textPrimary dark:text-white dark:text-opacity-80"
>
    <div class="flex flex-grow items-center justify-center">
        <span class="font-medium text-base">{routeHeaders[$location]}</span>
    </div>
    <a
        use:link
        href="/"
        class="absolute left-0 z-50 flex w-fit items-center justify-start gap-2"
    >
        <ArrowLeftIcon class="w-5 h-5" />
        <span class="font-semibold text-mbPrimary dark:text-mbPrimaryDark text-sm">{translateSimpleText("backText")}</span>
    </a>
</div>
