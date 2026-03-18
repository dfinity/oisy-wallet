<script lang="ts">
	import { Toggle } from '@dfinity/gix-components';
	import { tokenCategoryFilterEnabled } from '$lib/derived/settings.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { tokenCategoryFilterEnabledStore } from '$lib/stores/settings.store';

	let checked = $derived($tokenCategoryFilterEnabled);

	const toggleHide = () =>
		tokenCategoryFilterEnabledStore.set({
			key: 'token-category-filter-enabled',
			value: { enabled: !checked }
		});
</script>

<svelte:window onoisyToggleTokenCategoryFilter={toggleHide} />

<Toggle ariaLabel={$i18n.tokens.text.hide_asset_types} bind:checked on:nnsToggle={toggleHide} />
