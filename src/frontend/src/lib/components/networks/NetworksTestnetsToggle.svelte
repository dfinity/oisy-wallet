<script lang="ts">
	import { Toggle } from '@dfinity/gix-components';
	import { testnetsStore } from '$lib/stores/testnets.store';
	import { i18n } from '$lib/stores/i18n.store';

	let checked: boolean;
	$: checked = $testnetsStore?.enabled ?? false;

	const toggleTestnets = () => testnetsStore.set({ key: 'testnets', value: { enabled: !checked } });
</script>

<Toggle ariaLabel={$i18n.settings.testnets_toggle} bind:checked on:nnsToggle={toggleTestnets} />
