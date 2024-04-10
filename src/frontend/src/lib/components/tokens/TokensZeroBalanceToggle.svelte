<script lang="ts">
	import { Toggle } from '@dfinity/gix-components';
	import { hideZeroBalancesStore, testnetsStore } from '$lib/stores/settings.store';
	import { i18n } from '$lib/stores/i18n.store';

	let checked: boolean;
	$: checked = $hideZeroBalancesStore?.enabled ?? false;

	const toggleHide = () =>
		hideZeroBalancesStore.set({ key: 'hide-zero-balances', value: { enabled: !checked } });
</script>

<Toggle ariaLabel={$i18n.tokens.text.hide_zero_balances} bind:checked on:nnsToggle={toggleHide} />
