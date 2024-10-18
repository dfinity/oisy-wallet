<script lang="ts">
	import Checkbox from '$lib/components/ui/Checkbox.svelte';
	import { hideZeroBalances } from '$lib/derived/settings.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { hideZeroBalancesStore } from '$lib/stores/settings.store';

	let checked: boolean;
	$: checked = $hideZeroBalances;

	const toggleHide = () =>
		hideZeroBalancesStore.set({ key: 'hide-zero-balances', value: { enabled: !checked } });
</script>

<Checkbox bind:checked on:click={toggleHide}>
	{$i18n.tokens.text.hide_zeros}
</Checkbox>
