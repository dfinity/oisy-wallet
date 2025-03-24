<script lang="ts">
    import ButtonIcon from '$lib/components/ui/ButtonIcon.svelte';
    import {canShare, shareText} from "$lib/utils/share.utils";
    import IconShareArrow from "$lib/components/icons/lucide/IconShareArrow.svelte";

    export let shareAriaLabel: string;
    export let testId: string | undefined = undefined;
</script>

{#if canShare()}
    <ButtonIcon
            ariaLabel={shareAriaLabel}
            on:click={async () => await shareText(shareAriaLabel)}
            {testId}
            link={false}
    >
        <IconShareArrow size="24" slot="icon" />
    </ButtonIcon>
{/if}