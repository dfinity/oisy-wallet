<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import { slide } from 'svelte/transition';
	import IconHelp from '$lib/components/icons/lucide/IconHelp.svelte';
	import { i18n } from '$lib/stores/i18n.store';

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
</script>

<div class="mt-3 flex w-full flex-row">
	<span class="flex w-full flex-1 flex-row items-start">
		<span class="flex">{@render key()}</span>
		{#if hasInfoSlot && !permanentInfo}
			<button
				class="hit-area relative ml-1 flex p-0.5 align-top text-tertiary press-icon"
				aria-expanded={infoExpanded}
				aria-label={$i18n.core.text.info}
				onclick={() => (infoExpanded = !infoExpanded)}
			>
				<IconHelp size="18" />
			</button>
		{/if}
	</span>

	<span class="flex">{@render value?.()}</span>
</div>

{#if infoExpanded && hasInfoSlot}
	<span class="mt-1 flex w-full text-sm text-tertiary" transition:slide>{@render info?.()}</span>
{/if}
