<script lang="ts">
	import { IconClose } from '@dfinity/gix-components';
	import IconSearch from '$lib/components/icons/IconSearch.svelte';
	import InputTextWithAction from '$lib/components/ui/InputTextWithAction.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	interface Props {
		filter?: string;
		showResetButton?: boolean;
		placeholder: string;
		autofocus?: boolean;
		testId?: string;
	}

	let {
		filter = $bindable(''),
		showResetButton = false,
		placeholder,
		autofocus = false,
		testId
	}: Props = $props();
</script>

<InputTextWithAction
	name="filter"
	{autofocus}
	{placeholder}
	required={false}
	{testId}
	bind:value={filter}
>
	{#snippet innerEnd()}
		{#if showResetButton}
			<button aria-label={$i18n.core.text.clear_filter} onclick={() => (filter = '')}>
				<IconClose />
			</button>
		{:else}
			<IconSearch />
		{/if}
	{/snippet}
</InputTextWithAction>
