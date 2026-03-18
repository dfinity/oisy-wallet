<script lang="ts">
	import { Toggle } from '@dfinity/gix-components';
	import { hideTokenCategoryFilter } from '$lib/derived/settings.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { hideTokenCategoryFilterStore } from '$lib/stores/settings.store';

	let checked = $derived($hideTokenCategoryFilter);

	const toggleHide = () =>
		hideTokenCategoryFilterStore.set({
			key: 'hide-token-category-filter',
			value: { enabled: !checked }
		});
</script>

<svelte:window onoisyToggleTokenCategoryFilter={toggleHide} />

<Toggle ariaLabel={$i18n.tokens.text.hide_asset_types} bind:checked on:nnsToggle={toggleHide} />
