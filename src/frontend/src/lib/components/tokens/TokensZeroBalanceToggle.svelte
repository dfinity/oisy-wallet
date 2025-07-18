<script lang="ts">
	import { Toggle } from '@dfinity/gix-components';
	import { hideZeroBalances } from '$lib/derived/settings.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { hideZeroBalancesStore } from '$lib/stores/settings.store';

	let checked: boolean;
	$: checked = $hideZeroBalances;

	const toggleHide = () =>
		hideZeroBalancesStore.set({ key: 'hide-zero-balances', value: { enabled: !checked } });
</script>

<svelte:window on:oisyToggleZeroBalances={toggleHide} />

<Toggle ariaLabel={$i18n.tokens.text.hide_zero_balances} bind:checked on:nnsToggle={toggleHide} />
