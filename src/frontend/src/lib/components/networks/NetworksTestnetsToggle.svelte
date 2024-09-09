<script lang="ts">
	import { Toggle } from '@dfinity/gix-components';
	import { testnetsEnabled } from '$lib/derived/settings.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { testnetsStore } from '$lib/stores/settings.store';

	let checked: boolean;
	$: checked = $testnetsEnabled;

	const toggleTestnets = () => testnetsStore.set({ key: 'testnets', value: { enabled: !checked } });
</script>

<Toggle ariaLabel={$i18n.settings.alt.testnets_toggle} bind:checked on:nnsToggle={toggleTestnets} />
