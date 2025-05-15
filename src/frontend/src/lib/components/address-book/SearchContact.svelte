<script lang="ts">
	import { IconClose } from '@dfinity/gix-components';
	import IconSearch from '$lib/components/icons/IconSearch.svelte';
	import InputTextWithAction from '$lib/components/ui/InputTextWithAction.svelte';
	import { ADDRESS_BOOK_SEARCH_CONTACT_INPUT } from '$lib/constants/test-ids.constants';
	import { i18n } from '$lib/stores/i18n.store';

	export let onSearchChange: (value: string) => void;
	let search = '';

	$: onSearchChange(search);
</script>

<InputTextWithAction
	name="search"
	placeholder={$i18n.address_book.text.search_contact}
	bind:value={search}
	testId={ADDRESS_BOOK_SEARCH_CONTACT_INPUT}
	autofocus={true}
>
	<svelte:fragment slot="inner-end">
		{#if search}
			<button on:click={() => (search = '')} aria-label={$i18n.core.text.clear_filter}>
				<IconClose />
			</button>
		{:else}
			<IconSearch />
		{/if}
	</svelte:fragment>
</InputTextWithAction>
