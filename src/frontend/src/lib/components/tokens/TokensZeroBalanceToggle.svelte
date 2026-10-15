<script lang="ts">
	import Toggle from '$lib/components/ui/Toggle.svelte';
	import { hideZeroBalances } from '$lib/derived/settings.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import { hideZeroBalancesStore } from '$lib/stores/settings.store';

	interface Props {
		showLabel?: boolean;
	}
	let { showLabel = false }: Props = $props();

	let checked = $derived($hideZeroBalances);

	const toggleHide = () =>
		hideZeroBalancesStore.set({ key: 'hide-zero-balances', value: { enabled: !checked } });
</script>

<svelte:window onoisyToggleZeroBalances={toggleHide} />

<Toggle
	{showLabel}
	ariaLabel={$i18n.tokens.text.hide_zero_balances}
	onToggle={toggleHide}
	bind:checked
/>
