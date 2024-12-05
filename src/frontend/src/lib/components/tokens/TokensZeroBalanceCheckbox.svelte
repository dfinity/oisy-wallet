<script lang="ts">
	import { Checkbox } from '@dfinity/gix-components';
	import { hideZeroBalances } from '$lib/derived/settings.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { hideZeroBalancesStore } from '$lib/stores/settings.store';

	let checked: boolean;
	$: checked = $hideZeroBalances;

	const toggleHide = () =>
		hideZeroBalancesStore.set({ key: 'hide-zero-balances', value: { enabled: !checked } });
</script>

<div style="--checkbox-label-order: 1">
	<Checkbox inputId="checkbox-zero-balance" {checked} on:nnsChange={toggleHide}>
		{$i18n.tokens.text.hide_zeros}
	</Checkbox>
</div>
