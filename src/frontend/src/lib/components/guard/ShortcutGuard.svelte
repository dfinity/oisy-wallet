<script lang="ts">

    import type {Snippet} from "svelte";
    import {privacyModeStore} from "$lib/stores/settings.store";
    import {isPrivacyMode} from "$lib/derived/settings.derived";

    interface Props {
        children?: Snippet;
    }

    let {children}: Props = $props();

    const handleKeydown = (e: KeyboardEvent) => {
        const isInputField = e?.target instanceof HTMLInputElement;

        if (!isInputField) {
            if (e.key === 'p') {
                privacyModeStore.set({ key: 'privacy-mode', value: { enabled: !$isPrivacyMode } })
            }
        }
    }
</script>

{@render children?.()}

<svelte:window on:keydown={handleKeydown} />
