<script lang="ts">
	import { IconClose } from '@dfinity/gix-components';
	import IconSearch from '$lib/components/icons/IconSearch.svelte';
	import InputTextWithAction from '$lib/components/ui/InputTextWithAction.svelte';
	import { i18n } from '$lib/stores/i18n.store';

	export let filter = '';
	export let noMatch = false;
	export let placeholder: string;
</script>

<InputTextWithAction name="filter" required={false} bind:value={filter} {placeholder}>
	<svelte:fragment slot="inner-end">
		{#if noMatch}
			<button on:click={() => (filter = '')} aria-label={$i18n.core.text.clear_filter}>
				<IconClose />
			</button>
		{:else}
			<IconSearch />
		{/if}
	</svelte:fragment>
</InputTextWithAction>
