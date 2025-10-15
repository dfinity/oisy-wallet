<script lang="ts">
	import { nonNullish } from '@dfinity/utils';
	import type { Snippet } from 'svelte';
	import { slide } from 'svelte/transition';
	import IconHelp from '$lib/components/icons/lucide/IconHelp.svelte';

	interface Props {
		permanentInfo?: boolean;
		key: Snippet;
		value?: Snippet;
		info: Snippet;
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
				class="ml-1 flex p-0.5 align-top text-tertiary"
				onclick={() => (infoExpanded = !infoExpanded)}
			>
				<IconHelp size="18" />
			</button>
		{/if}
	</span>

	<span class="flex">{@render value?.()}</span>
</div>

{#if infoExpanded}
	<span class="mt-1 flex w-full text-sm text-tertiary" transition:slide>{@render info()}</span>
{/if}
