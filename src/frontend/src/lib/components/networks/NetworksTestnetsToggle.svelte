<script lang="ts">
	import { Toggle } from '@dfinity/gix-components';
	import { testnetsStore } from '$lib/stores/testnets.store';

	let checked: boolean;
	$: checked = $testnetsStore?.enabled ?? false;

	const toggleTestnets = () => testnetsStore.set({ key: 'testnets', value: { enabled: !checked } });
</script>

<Toggle ariaLabel="Toggle to show or hide testnets" bind:checked on:nnsToggle={toggleTestnets} />
