<script lang="ts">
	import { Toggle } from '@dfinity/gix-components';
	import { showHidden } from '$lib/derived/settings.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { showHiddenStore } from '$lib/stores/settings.store';

	let checked = $derived($showHidden);

	const toggleHidden = () =>
		showHiddenStore.set({ key: 'show-hidden', value: { enabled: !checked } });
</script>

<svelte:window on:oisyToggleShowHidden={toggleHidden} />

<Toggle ariaLabel={$i18n.nfts.text.show_hidden} bind:checked on:nnsToggle={toggleHidden} />
