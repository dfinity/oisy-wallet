<script lang="ts">
	import IconSearch from '$lib/components/icons/IconSearch.svelte';
	import InputTextWithAction from '$lib/components/ui/InputTextWithAction.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	export let filter = '';
	export let showResetButton = false;
	export let placeholder: string;
	export let autofocus = false;
</script>

<InputTextWithAction
	name="filter"
	required={false}
	bind:value={filter}
	{placeholder}
	{autofocus}
	{showResetButton}
	resetButtonAriaLabel={$i18n.core.text.clear_filter}
>
	<svelte:fragment slot="inner-end">
		{#if !showResetButton}
			<IconSearch />
		{/if}
	</svelte:fragment>
</InputTextWithAction>
