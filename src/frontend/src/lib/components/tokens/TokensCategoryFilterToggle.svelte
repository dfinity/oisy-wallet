<script lang="ts">
	import Toggle from '$lib/components/ui/Toggle.svelte';
	import { hideTokenCategoryFilter } from '$lib/derived/settings.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import {
		hideTokenCategoryFilterStore,
		tokenCategoryFilterStore
	} from '$lib/stores/settings.store';

	let checked = $derived($hideTokenCategoryFilter);

	const toggleHide = () => {
		hideTokenCategoryFilterStore.set({
			key: 'hide-token-category-filter',
			value: { enabled: !checked }
		});

		tokenCategoryFilterStore.reset({ key: 'token-category-filter' });
	};
</script>

<svelte:window onoisyToggleTokenCategoryFilter={toggleHide} />

<Toggle ariaLabel={$i18n.tokens.text.hide_asset_types} onToggle={toggleHide} bind:checked />
