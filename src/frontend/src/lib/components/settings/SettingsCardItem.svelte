<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import { slide } from 'svelte/transition';
	import HelpToggle from '$lib/components/ui/HelpToggle.svelte';
	import { nextElementId } from '$lib/utils/html.utils';

	interface Props {
		permanentInfo?: boolean;
		key: Snippet;
		value?: Snippet;
		// Optional: when omitted the help-icon button is suppressed entirely. Callers that
		// want to surface a description per row pass a snippet; section-level callers (e.g.
		// SettingsExportData) keep descriptions at the section header instead.
		info?: Snippet;
	}

	let { permanentInfo = false, key, value, info }: Props = $props();

	let hasInfoSlot = $derived(nonNullish(info));

	let infoExpanded = $derived(permanentInfo);

	// Several rows sit on one page, so each toggle is named "Info" plus its row's label
	// ("Info Principal"), not just "Info".
	const toggleId = nextElementId('settings-info-toggle-');
	const keyId = nextElementId('settings-key-');
</script>

<div class="mt-3 flex w-full flex-row">
	<span class="flex w-full flex-1 flex-row items-start">
		<span id={keyId} class="flex">{@render key()}</span>
		{#if hasInfoSlot && !permanentInfo}
			<HelpToggle
				id={toggleId}
				ariaLabelledby={`${toggleId} ${keyId}`}
				styleClass="ml-1 flex p-0.5 align-top text-tertiary"
				bind:expanded={infoExpanded}
			/>
		{/if}
	</span>

	<span class="flex">{@render value?.()}</span>
</div>

{#if infoExpanded && hasInfoSlot}
	<span class="mt-1 flex w-full text-sm text-tertiary" transition:slide>{@render info?.()}</span>
{/if}
