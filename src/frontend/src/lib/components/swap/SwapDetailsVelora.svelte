<script lang="ts">
	import ModalValue from '$lib/components/ui/ModalValue.svelte';
	import { currentCurrencySymbol } from '$lib/derived/currency.derived';
	import { i18n } from '$lib/stores/i18n.store';
	import type { SwapMappedResult, SwapProvider } from '$lib/types/swap';

	interface Props {
		provider: Extract<SwapMappedResult, { provider: SwapProvider.VELORA }>;
	}

	const { provider }: Props = $props();
</script>

<ModalValue>
	{#snippet label()}
		{$i18n.swap.text.swap_route}
	{/snippet}

	{#snippet mainValue()}
		{provider.type === 'delta' ? 'Delta' : 'Market'}
	{/snippet}
</ModalValue>

{#if provider.type === 'delta'}
	<ModalValue>
		{#snippet label()}
			{$i18n.swap.text.network_cost}
		{/snippet}

		{#snippet mainValue()}
			{$i18n.swap.text.gasless}
		{/snippet}
	</ModalValue>

	<ModalValue>
		{#snippet label()}
			{$i18n.swap.text.swap_fees}
		{/snippet}

		{#snippet mainValue()}
			{$currentCurrencySymbol}0
		{/snippet}
	</ModalValue>
{/if}
